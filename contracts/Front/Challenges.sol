/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../Boilerplate/Head.sol";
import "../Front/Payouts.sol";
import "../Middleware/Sheltering.sol";
import "../Configuration/Fees.sol";
import "../Configuration/Config.sol";
import "../Configuration/Time.sol";
import "../Storage/AtlasStakeStore.sol";
import "../Storage/BundleStore.sol";


contract Challenges is Base {

    using SafeMath for uint;

    struct Challenge {
        address sheltererId;
        bytes32 bundleId;
        address challengerId;
        uint feePerChallenge;
        uint creationTime;
        uint8 activeCount;
    }

    event ChallengeCreated(address sheltererId, bytes32 bundleId, bytes32 challengeId, uint count);
    event ChallengeResolved(address sheltererId, bytes32 bundleId, bytes32 challengeId, address resolverId);
    event ChallengeTimeout(address sheltererId, bytes32 bundleId, bytes32 challengeId, uint penalty);

    mapping(bytes32 => Challenge) public challenges;

    constructor(Head _head) public Base(_head) { }

    function() public payable {}

    function start(address sheltererId, bytes32 bundleId) public payable {
        validateChallenge(sheltererId, bundleId);
        validateFeeAmount(1, bundleId);
        Time time = context().time();
        Challenge memory challenge = Challenge(sheltererId, bundleId, msg.sender, msg.value, time.currentTimestamp(), 1);
        bytes32 challengeId = storeChallenge(challenge);

        emit ChallengeCreated(sheltererId, bundleId, challengeId, 1);
    }

    function startForSystem(address uploaderId, bytes32 bundleId, uint8 challengesCount) public onlyContextInternalCalls payable {
        validateSystemChallenge(uploaderId, bundleId);
        validateFeeAmount(challengesCount, bundleId);

        Time time = context().time();
        Challenge memory challenge = Challenge(uploaderId, bundleId, 0x0, msg.value / challengesCount, time.currentTimestamp(), challengesCount);
        bytes32 challengeId = storeChallenge(challenge);

        emit ChallengeCreated(uploaderId, bundleId, challengeId, challengesCount);
    }

    function resolve(bytes32 challengeId) public {
        require(challengeIsInProgress(challengeId));

        Challenge storage challenge = challenges[challengeId];

        Sheltering sheltering = context().sheltering();
        require(!sheltering.isSheltering(msg.sender, challenge.bundleId));

        sheltering.addShelterer(challenge.bundleId, msg.sender, challenge.feePerChallenge);
        emit ChallengeResolved(challenge.sheltererId, challenge.bundleId, challengeId, msg.sender);
        grantReward(msg.sender, challenge);
        removeChallengeOrDecreaseActiveCount(challengeId);
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
            AtlasStakeStore atlasStakeStore = context().atlasStakeStore();
            penalty = atlasStakeStore.slash(challenge.sheltererId, this);
            revokedReward = revokeReward(challenge);

            Sheltering sheltering = context().sheltering();
            sheltering.removeShelterer(challenge.bundleId, challenge.sheltererId);

            refundAddress = challenge.challengerId;
        }

        uint amountToReturn = (challenge.feePerChallenge * challenge.activeCount) + revokedReward + penalty;
        emit ChallengeTimeout(challenge.sheltererId, challenge.bundleId, challengeId, penalty);
        delete challenges[challengeId];
        refundAddress.transfer(amountToReturn);
    }

    function challengeIsTimedOut(bytes32 challengeId) public view returns(bool) {
        Config config = context().config();
        Time time = context().time();
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

    function challengeIsInProgress(bytes32 challengeId) public view returns (bool) {
        return getActiveChallengesCount(challengeId) > 0;
    }

    function validateChallenge(address sheltererId, bytes32 bundleId) private view {
        require(!challengeIsInProgress(getChallengeId(sheltererId, bundleId)));
        Sheltering sheltering = context().sheltering();
        require(sheltering.isSheltering(sheltererId, bundleId));
        BundleStore bundleStore = context().bundleStore();
        uint endTime = bundleStore.getShelteringExpirationDate(bundleId, sheltererId);
        Time time = context().time();
        require(endTime > time.currentTimestamp());
    }

    function validateSystemChallenge(address uploaderId, bytes32 bundleId) private view {
        require(!challengeIsInProgress(getChallengeId(uploaderId, bundleId)));
        BundleStore bundleStore = context().bundleStore();
        require(bundleStore.isUploader(uploaderId, bundleId));
    }

    function validateFeeAmount(uint8 challengesCount, bytes32 bundleId) private view {
        BundleStore bundleStore = context().bundleStore();
        uint64 storagePeriods = bundleStore.getStoragePeriodsCount(bundleId);
        Fees fees = context().fees();
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

    function grantReward(address newSheltererId, Challenge challenge) private {
        BundleStore bundleStore = context().bundleStore();
        uint64 storagePeriods = bundleStore.getStoragePeriodsCount(challenge.bundleId);

        Payouts payouts = context().payouts();
        uint64 payoutPeriods = storagePeriods * 13;
        payouts.grantShelteringReward.value(challenge.feePerChallenge)(newSheltererId, payoutPeriods);
    }

    function revokeReward(Challenge challenge) private returns(uint) {
        Sheltering sheltering = context().sheltering();
        (uint beginTimestamp, uint64 storagePeriods, uint rewardToRevoke) = sheltering.getShelteringData(challenge.bundleId, challenge.sheltererId);
        
        Payouts payouts = context().payouts();
        uint64 payoutPeriods = storagePeriods * 13;
        payouts.revokeShelteringReward(challenge.sheltererId, beginTimestamp, payoutPeriods, rewardToRevoke, address(this));

        return rewardToRevoke;
    }
}
