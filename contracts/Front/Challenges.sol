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
import "../Storage/ChallengesStore.sol";


contract Challenges is Base {

    using SafeMath for uint;
    using SafeMath for uint32;
    using SafeMath for uint64;
    using SafeMathExtensions for uint;

    event ChallengeCreated(address sheltererId, bytes32 bundleId, bytes32 challengeId, uint count);
    event ChallengeResolved(address sheltererId, bytes32 bundleId, bytes32 challengeId, address resolverId);
    event ChallengeTimeout(address sheltererId, bytes32 bundleId, bytes32 challengeId, uint penalty);

    Time private time;
    Sheltering private sheltering;
    AtlasStakeStore private atlasStakeStore;
    Config private config;
    Fees private fees;
    ChallengesStore private challengesStore;

    constructor(Head _head, Time _time, Sheltering _sheltering, AtlasStakeStore _atlasStakeStore, Config _config,
        Fees _fees, ChallengesStore _challengesStore)
    public Base(_head)
    {
        time = _time;
        sheltering = _sheltering;
        atlasStakeStore = _atlasStakeStore;
        config = _config;
        fees = _fees;
        challengesStore = _challengesStore;
    }

    function() public payable {}

    function start(address sheltererId, bytes32 bundleId) public payable {
        validateChallenge(sheltererId, bundleId);
        validateFeeAmount(1, bundleId);

        bytes32 challengeId = challengesStore.store(
            sheltererId,
            bundleId,
            msg.sender,
            msg.value,
            time.currentTimestamp(),
            1,
            challengesStore.getNextChallengeSequenceNumber()
        );
        challengesStore.incrementNextChallengeSequenceNumber(1);

        emit ChallengeCreated(sheltererId, bundleId, challengeId, 1);
    }

    function startForSystem(address uploaderId, bytes32 bundleId, uint8 challengesCount) public onlyContextInternalCalls payable {
        validateSystemChallenge(uploaderId, bundleId);
        validateFeeAmount(challengesCount, bundleId);

        bytes32 challengeId = challengesStore.store(
            uploaderId,
            bundleId,
            0x0,
            msg.value / challengesCount,
            time.currentTimestamp(),
            challengesCount,
            challengesStore.getNextChallengeSequenceNumber()
        );
        challengesStore.incrementNextChallengeSequenceNumber(challengesCount);

        emit ChallengeCreated(uploaderId, bundleId, challengeId, challengesCount);
    }

    function resolve(bytes32 challengeId) public {
        require(canResolve(msg.sender, challengeId));

        (address sheltererId, bytes32 bundleId,, uint feePerChallenge,,, uint sequenceNumber) = challengesStore.getChallenge(challengeId);
        sheltering.addShelterer.value(feePerChallenge)(bundleId, msg.sender);
        atlasStakeStore.updateLastChallengeResolvedSequenceNumber(msg.sender, sequenceNumber);

        emit ChallengeResolved(sheltererId, bundleId, challengeId, msg.sender);

        removeChallengeOrDecreaseActiveCount(challengeId);
        increaseChallengeSequenceNumberIfNecessary(challengeId);
    }

    function markAsExpired(bytes32 challengeId) public {
        require(challengeIsInProgress(challengeId));
        require(challengeIsTimedOut(challengeId));

        (address sheltererId, bytes32 bundleId, address challengerId, uint feePerChallenge,, uint8 activeCount,) = challengesStore.getChallenge(challengeId);

        uint penalty = 0;
        uint revokedReward = 0;
        address refundAddress;

        if (isSystemChallenge(challengeId)) {
            refundAddress = sheltererId;
        } else {
            penalty = sheltering.penalizeShelterer(sheltererId, this);
            revokedReward = sheltering.removeShelterer(bundleId, sheltererId, this);
            refundAddress = challengerId;
        }

        uint amountToReturn = (feePerChallenge * activeCount) + revokedReward + penalty;
        emit ChallengeTimeout(sheltererId, bundleId, challengeId, penalty);
        challengesStore.remove(challengeId);
        refundAddress.transfer(amountToReturn);
    }

    function canResolve(address resolverId, bytes32 challengeId) public view returns (bool) {
        bytes32 bundleId = getChallengedBundle(challengeId);

        // solium-disable-next-line operator-whitespace
        return challengeIsInProgress(challengeId) &&
        !sheltering.isSheltering(bundleId, resolverId) &&
        !isOnCooldown(resolverId, challengeId) &&
        atlasStakeStore.canStore(resolverId);
    }

    function challengeIsTimedOut(bytes32 challengeId) public view returns (bool) {
        uint64 creationTime = getChallengeCreationTime(challengeId);
        return time.currentTimestamp() > creationTime + config.CHALLENGE_DURATION();
    }

    function getChallengedShelterer(bytes32 challengeId) public view returns (address) {
        (address sheltererId,,,,,,) = challengesStore.getChallenge(challengeId);
        return sheltererId;
    }

    function getChallengedBundle(bytes32 challengeId) public view returns (bytes32) {
        (, bytes32 bundleId,,,,,) = challengesStore.getChallenge(challengeId);
        return bundleId;
    }

    function getChallenger(bytes32 challengeId) public view returns (address) {
        (,, address challengerId,,,,) = challengesStore.getChallenge(challengeId);
        return challengerId;
    }

    function getChallengeFee(bytes32 challengeId) public view returns (uint) {
        (,,, uint feePerChallenge,,,) = challengesStore.getChallenge(challengeId);
        return feePerChallenge;
    }

    function getChallengeCreationTime(bytes32 challengeId) public view returns (uint64) {
        (,,,, uint64 creationTime,,) = challengesStore.getChallenge(challengeId);
        return creationTime;
    }

    function getActiveChallengesCount(bytes32 challengeId) public view returns (uint8) {
        (,,,,, uint8 activeCount,) = challengesStore.getChallenge(challengeId);
        return activeCount;
    }

    function getChallengeSequenceNumber(bytes32 challengeId) public view returns (uint) {
        (,,,,,, uint sequenceNumber) = challengesStore.getChallenge(challengeId);
        return sequenceNumber;
    }

    function challengeIsInProgress(bytes32 challengeId) public view returns (bool) {
        return getActiveChallengesCount(challengeId) > 0;
    }

    function isSystemChallenge(bytes32 challengeId) public view returns (bool) {
        return getChallenger(challengeId) == 0x0;
    }

    function getChallengeId(address sheltererId, bytes32 bundleId) public view returns (bytes32) {
        return challengesStore.getChallengeId(sheltererId, bundleId);
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

    function removeChallengeOrDecreaseActiveCount(bytes32 challengeId) private {
        if (getActiveChallengesCount(challengeId) == 1) {
            challengesStore.remove(challengeId);
        } else {
            challengesStore.decreaseActiveCount(challengeId);
        }
    }

    function increaseChallengeSequenceNumberIfNecessary(bytes32 challengeId) private {
        if (getActiveChallengesCount(challengeId) > 0) {
            challengesStore.increaseSequenceNumber(challengeId);
        }
    }

    function isOnCooldown(address resolverId, bytes32 challengeId) private view returns (bool) {
        uint lastResolvedSequenceNumber = atlasStakeStore.getLastChallengeResolvedSequenceNumber(resolverId);
        return lastResolvedSequenceNumber != 0 && lastResolvedSequenceNumber.add(getCooldown()) > getChallengeSequenceNumber(challengeId);
    }
}
