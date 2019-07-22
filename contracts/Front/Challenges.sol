/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../Configuration/Fees.sol";
import "../Configuration/Config.sol";
import "../Configuration/Time.sol";
import "../Lib/SafeMathExtensions.sol";
import "../Lib/DmpAlgorithm.sol";
import "../Boilerplate/Head.sol";
import "../Middleware/Sheltering.sol";
import "../Storage/AtlasStakeStore.sol";
import "../Storage/ChallengesStore.sol";
import "../Storage/ChallengesEventEmitter.sol";
import "../Front/DmpAtlasSelectionBase.sol";


contract Challenges is DmpAtlasSelectionBase {

    using SafeMath for uint;
    using SafeMath for uint32;
    using SafeMath for uint64;
    using SafeMathExtensions for uint;

    Fees private fees;
    ChallengesStore private challengesStore;
    ChallengesEventEmitter private challengesEventEmitter;

    constructor(Head _head, Time _time, Sheltering _sheltering, AtlasStakeStore _atlasStakeStore, Config _config,
        Fees _fees, ChallengesStore _challengesStore, ChallengesEventEmitter _challengesEventEmitter)
    public DmpAtlasSelectionBase(_head, _time, _sheltering, _atlasStakeStore, _config)
    {
        fees = _fees;
        challengesStore = _challengesStore;
        challengesEventEmitter = _challengesEventEmitter;
    }

    function() public payable {}

    function start(address sheltererId, bytes32 bundleId) public payable {
        validateChallenge(sheltererId, bundleId);
        validateFeeAmount(1, bundleId);

        bytes32 challengeId = challengesStore.store.value(msg.value)(
            sheltererId,
            bundleId,
            msg.sender,
            msg.value,
            time.currentTimestamp(),
            1
        );

        challengesEventEmitter.challengeCreated(sheltererId, bundleId, challengeId, 1);
    }

    function startForSystem(address uploaderId, bytes32 bundleId, uint8 challengesCount) public onlyContextInternalCalls payable {
        validateSystemChallenge(uploaderId, bundleId);
        validateFeeAmount(challengesCount, bundleId);

        bytes32 challengeId = challengesStore.store.value(msg.value)(
            uploaderId,
            bundleId,
            0x0,
            msg.value.div(challengesCount),
            time.currentTimestamp(),
            challengesCount
        );

        challengesEventEmitter.challengeCreated(uploaderId, bundleId, challengeId, challengesCount);
    }

    function resolve(bytes32 challengeId) public {
        require(canResolve(msg.sender, challengeId));

        (address sheltererId, bytes32 bundleId,, uint feePerChallenge,,, uint sequenceNumber) = challengesStore.getChallenge(challengeId);
        challengesStore.transferFee(this, feePerChallenge);
        sheltering.addShelterer.value(feePerChallenge)(bundleId, msg.sender);
        atlasStakeStore.updateLastChallengeResolvedSequenceNumber(msg.sender, sequenceNumber);

        challengesEventEmitter.challengeResolved(sheltererId, bundleId, challengeId, msg.sender);

        removeChallengeOrDecreaseActiveCount(challengeId);
    }

    function markAsExpired(bytes32 challengeId) public {
        require(isInProgress(challengeId));
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

        uint feeToReturn = feePerChallenge.mul(activeCount);
        challengesEventEmitter.challengeTimeout(sheltererId, bundleId, challengeId, penalty);
        challengesStore.remove(challengeId);
        challengesStore.transferFee(this, feeToReturn);
        refundAddress.transfer(feeToReturn + revokedReward + penalty);
    }

    function canResolve(address resolverId, bytes32 shelteringInviteId) public view returns (bool) {
        bytes32 bundleId = getBundle(shelteringInviteId);

        // solium-disable-next-line operator-whitespace
        return isInProgress(shelteringInviteId) &&
        !sheltering.isSheltering(bundleId, resolverId) &&
        resolverId == getDesignatedShelterer(shelteringInviteId) &&
        atlasStakeStore.getStake(resolverId) > 0;
    }

    function getBundle(bytes32 shelteringInviteId) public view returns (bytes32) {
        (, bytes32 bundleId,,,,,) = challengesStore.getChallenge(shelteringInviteId);
        return bundleId;
    }

    function computeDmpBaseHash(bytes32 shelteringInviteId) public view returns (bytes32) {
        return keccak256(abi.encodePacked(shelteringInviteId, getChallengeSequenceNumber(shelteringInviteId)));
    }

    function getCreationTime(bytes32 shelteringInviteId) public view returns (uint64) {
        (,,,, uint64 creationTime,,) = challengesStore.getChallenge(shelteringInviteId);
        return creationTime;
    }

    function isInProgress(bytes32 shelteringInviteId) public view returns (bool) {
        return getActiveChallengesCount(shelteringInviteId) > 0;
    }

    function getChallengeCreationTime(bytes32 challengeId) public view returns (uint64) {
        return getCreationTime(challengeId);
    }

    function challengeIsInProgress(bytes32 challengeId) public view returns (bool) {
        return isInProgress(challengeId);
    }

    function getChallengeDesignatedShelterer(bytes32 challengeId) public view returns (address) {
        return getDesignatedShelterer(challengeId);
    }

    function challengeIsTimedOut(bytes32 challengeId) public view returns (bool) {
        uint64 creationTime = getCreationTime(challengeId);
        return time.currentTimestamp() > creationTime.add(config.CHALLENGE_DURATION());
    }

    function getChallengedShelterer(bytes32 challengeId) public view returns (address) {
        (address sheltererId,,,,,,) = challengesStore.getChallenge(challengeId);
        return sheltererId;
    }

    function getChallenger(bytes32 challengeId) public view returns (address) {
        (,, address challengerId,,,,) = challengesStore.getChallenge(challengeId);
        return challengerId;
    }

    function getChallengeFee(bytes32 challengeId) public view returns (uint) {
        (,,, uint feePerChallenge,,,) = challengesStore.getChallenge(challengeId);
        return feePerChallenge;
    }

    function getActiveChallengesCount(bytes32 challengeId) public view returns (uint8) {
        (,,,,, uint8 activeCount,) = challengesStore.getChallenge(challengeId);
        return activeCount;
    }

    function getChallengeSequenceNumber(bytes32 challengeId) public view returns (uint) {
        (,,,,,, uint sequenceNumber) = challengesStore.getChallenge(challengeId);
        return sequenceNumber;
    }

    function isSystemChallenge(bytes32 challengeId) public view returns (bool) {
        return getChallenger(challengeId) == 0x0;
    }

    function getChallengeId(address sheltererId, bytes32 bundleId) public view returns (bytes32) {
        return challengesStore.getChallengeId(sheltererId, bundleId);
    }

    function validateChallenge(address sheltererId, bytes32 bundleId) private view {
        require(!isInProgress(getChallengeId(sheltererId, bundleId)));
        require(sheltering.isSheltering(bundleId, sheltererId));

        uint shelteringCap = sheltering.getShelteringCap();
        uint shelterersCount = sheltering.getBundleShelterersCount(bundleId);
        uint challengesOnBundleCount = challengesStore.getActiveChallengesOnBundleCount(bundleId);
        require(shelteringCap > shelterersCount.add(challengesOnBundleCount));
    }

    function validateSystemChallenge(address uploaderId, bytes32 bundleId) private view {
        require(!isInProgress(getChallengeId(uploaderId, bundleId)));
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
}
