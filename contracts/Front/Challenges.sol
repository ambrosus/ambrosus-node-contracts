/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../Boilerplate/Head.sol";
import "../Middleware/Sheltering.sol";
import "../Configuration/Fees.sol";
import "../Configuration/Config.sol";
import "../Configuration/Time.sol";
import "../Storage/AtlasStakeStore.sol";
import "../Lib/SafeMathExtensions.sol";


contract Challenges is Base {

    using SafeMath for uint;
    using SafeMath for uint32;
    using SafeMath for uint64;    
    using SafeMathExtensions for uint;

    struct Challenge {
        address sheltererId;
        bytes32 bundleId;
        address challengerId;
        uint feePerChallenge;
        uint creationTime;
        uint8 activeCount;
        uint sequenceNumber;
    }

    event ChallengeCreated(address sheltererId, bytes32 bundleId, bytes32 challengeId, uint count);
    event ChallengeResolved(address sheltererId, bytes32 bundleId, bytes32 challengeId, address resolverId);
    event ChallengeTimeout(address sheltererId, bytes32 bundleId, bytes32 challengeId, uint penalty);

    uint public nextChallengeSequenceNumber;

    mapping(bytes32 => Challenge) public challenges;

    Time private time;
    Sheltering private sheltering;
    AtlasStakeStore private atlasStakeStore;
    Config private config;
    Fees private fees;

    constructor(Head _head, Time _time, Sheltering _sheltering, AtlasStakeStore _atlasStakeStore, Config _config, Fees _fees) public Base(_head) {
        nextChallengeSequenceNumber = 1;
        time = _time;
        sheltering = _sheltering;
        atlasStakeStore = _atlasStakeStore;
        config = _config;
        fees = _fees;
    }

    function() public payable {}

    function start(address sheltererId, bytes32 bundleId) public payable {
        validateChallenge(sheltererId, bundleId);
        validateFeeAmount(1, bundleId);
        Challenge memory challenge = Challenge(sheltererId, bundleId, msg.sender, msg.value, time.currentTimestamp(), 1, nextChallengeSequenceNumber);
        bytes32 challengeId = storeChallenge(challenge);
        nextChallengeSequenceNumber++;
        emit ChallengeCreated(sheltererId, bundleId, challengeId, 1);
    }

    function startForSystem(address uploaderId, bytes32 bundleId, uint8 challengesCount) public onlyContextInternalCalls payable {
        validateSystemChallenge(uploaderId, bundleId);
        validateFeeAmount(challengesCount, bundleId);

        Challenge memory challenge = Challenge(
            uploaderId, bundleId, 0x0, msg.value / challengesCount, time.currentTimestamp(), challengesCount, nextChallengeSequenceNumber);
        bytes32 challengeId = storeChallenge(challenge);
        nextChallengeSequenceNumber += challengesCount;

        emit ChallengeCreated(uploaderId, bundleId, challengeId, challengesCount);
    }

    function resolve(bytes32 challengeId) public {
        require(canResolve(msg.sender, challengeId));

        Challenge storage challenge = challenges[challengeId];
        sheltering.addShelterer.value(challenge.feePerChallenge)(challenge.bundleId, msg.sender);
        atlasStakeStore.updateLastChallengeResolvedSequenceNumber(msg.sender, challenge.sequenceNumber);

        emit ChallengeResolved(challenge.sheltererId, challenge.bundleId, challengeId, msg.sender);

        removeChallengeOrDecreaseActiveCount(challengeId);
        increaseChallengeSequenceNumberIfNecessary(challengeId);
    }

    function markAsExpired(bytes32 challengeId) public {
        require(challengeIsInProgress(challengeId));
        require(challengeIsTimedOut(challengeId));

        Challenge storage challenge = challenges[challengeId];

        uint penalty = 0;
        uint revokedReward = 0;
        address refundAddress;

        if (isSystemChallenge(challengeId)) {
            refundAddress = challenge.sheltererId;
        } else {
            penalty = sheltering.penalizeShelterer(challenge.sheltererId, this);
            revokedReward = sheltering.removeShelterer(challenge.bundleId, challenge.sheltererId, this);
            refundAddress = challenge.challengerId;
        }

        uint amountToReturn = (challenge.feePerChallenge * challenge.activeCount) + revokedReward + penalty;
        emit ChallengeTimeout(challenge.sheltererId, challenge.bundleId, challengeId, penalty);
        delete challenges[challengeId];
        refundAddress.transfer(amountToReturn);
    }

    function canResolve(address resolverId, bytes32 challengeId) public view returns (bool) {
        Challenge storage challenge = challenges[challengeId];

        // solium-disable-next-line operator-whitespace
        return challengeIsInProgress(challengeId) &&
            !sheltering.isSheltering(challenge.bundleId, resolverId) &&
            atlasStakeStore.canStore(resolverId);
    }

    function challengeIsTimedOut(bytes32 challengeId) public view returns(bool) {
        return time.currentTimestamp() > challenges[challengeId].creationTime + config.CHALLENGE_DURATION();
    }

    function isSystemChallenge(bytes32 challengeId) public view returns(bool) {
        return challenges[challengeId].challengerId == 0x0;
    }

    function getChallengeId(address sheltererId, bytes32 bundleId) public pure returns(bytes32) {
        return keccak256(abi.encodePacked(sheltererId, bundleId));
    }

    function getChallengedShelterer(bytes32 challengeId) public view returns(address) {
        return challenges[challengeId].sheltererId;
    }

    function getChallengedBundle(bytes32 challengeId) public view returns(bytes32) {
        return challenges[challengeId].bundleId;
    }

    function getChallenger(bytes32 challengeId) public view returns(address) {
        return challenges[challengeId].challengerId;
    }

    function getChallengeFee(bytes32 challengeId) public view returns(uint) {
        return challenges[challengeId].feePerChallenge;
    }

    function getChallengeCreationTime(bytes32 challengeId) public view returns(uint) {
        return challenges[challengeId].creationTime;
    }

    function getActiveChallengesCount(bytes32 challengeId) public view returns(uint) {
        return challenges[challengeId].activeCount;
    }

    function getChallengeSequenceNumber(bytes32 challengeId) public view returns(uint) {
        return challenges[challengeId].sequenceNumber;
    }

    function challengeIsInProgress(bytes32 challengeId) public view returns (bool) {
        return getActiveChallengesCount(challengeId) > 0;
    }

    function getCooldown() public view returns (uint) {
        uint32 numberOfStakers = atlasStakeStore.getNumberOfStakers();
        uint32 lowReduction = config.COOLDOWN_LOW_REDUCTION();
        if (numberOfStakers < lowReduction) {
            return 0;
        }
        uint32 threshold = config.COOLDOWN_SWITCH_THRESHOLD();
        if (numberOfStakers < threshold) {
            return numberOfStakers.sub(lowReduction).castTo32();
        }
        return numberOfStakers.mul(config.COOLDOWN_HIGH_PERCENTAGE()).div(100).add(1).castTo32();
    }

    function validateChallenge(address sheltererId, bytes32 bundleId) private view {
        require(!challengeIsInProgress(getChallengeId(sheltererId, bundleId))); 
        require(sheltering.isSheltering(bundleId, sheltererId));
    }

    function validateSystemChallenge(address uploaderId, bytes32 bundleId) private view {
        require(!challengeIsInProgress(getChallengeId(uploaderId, bundleId)));
        require(sheltering.getBundleUploader(bundleId) == uploaderId);
    }

    function validateFeeAmount(uint8 challengesCount, bytes32 bundleId) private view {
        uint64 storagePeriods = sheltering.getBundleStoragePeriodsCount(bundleId);
        uint fee = fees.getFeeForChallenge(storagePeriods);
        require(msg.value == fee * challengesCount);
    }

    function storeChallenge(Challenge challenge) private returns(bytes32) {
        bytes32 challengeId = getChallengeId(challenge.sheltererId, challenge.bundleId);
        challenges[challengeId] = challenge;
        return challengeId;
    }

    function removeChallengeOrDecreaseActiveCount(bytes32 challengeId) private {
        require(challengeIsInProgress(challengeId));
        if (challenges[challengeId].activeCount == 1) {
            delete challenges[challengeId];
        } else {
            challenges[challengeId].activeCount--;
        }
    }

    function increaseChallengeSequenceNumberIfNecessary(bytes32 challengeId) private {
        if (challenges[challengeId].activeCount > 0) {
            challenges[challengeId].sequenceNumber++;
        }
    }
}
