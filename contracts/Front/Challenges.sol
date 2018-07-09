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
import "../Storage/StakeStore.sol";
import "../Storage/BundleStore.sol";


contract Challenges is Base {

    using SafeMath for uint;

    struct Challenge {
        address sheltererId;
        bytes32 bundleId;
        address challengerId;
        uint fee;
        uint creationTime;
        uint8 activeCount;
    }

    event ChallengeCreated(address sheltererId, bytes32 bundleId, bytes32 challengeId, uint count);
    event ChallengeResolved(address sheltererId, bytes32 bundleId, bytes32 challengeId, address resolverId);
    event ChallengeTimeout(address sheltererId, bytes32 bundleId, bytes32 challengeId, uint penalty);

    mapping(bytes32 => Challenge) public challenges;

    constructor(Head _head) public Base(_head) { }

    function start(address sheltererId, bytes32 bundleId) public payable {
        validateChallenge(sheltererId, bundleId);
        validateFeeAmount(1, bundleId);
        Time time = context().time();
        Challenge memory challenge = Challenge(sheltererId, bundleId, msg.sender, msg.value, time.currentTimestamp(), 1);
        bytes32 challengeId = storeChallenge(challenge);

        emit ChallengeCreated(sheltererId, bundleId, challengeId, 1);
    }

    function startForSystem(address sheltererId, bytes32 bundleId, uint8 challengesCount) public onlyContextInternalCalls payable {
        validateChallenge(sheltererId, bundleId);
        validateFeeAmount(challengesCount, bundleId);

        Time time = context().time();
        Challenge memory challenge = Challenge(sheltererId, bundleId, 0x0, msg.value, time.currentTimestamp(), challengesCount);
        bytes32 challengeId = storeChallenge(challenge);

        emit ChallengeCreated(sheltererId, bundleId, challengeId, challengesCount);
    }

    function resolve(bytes32 challengeId) public {
        require(challengeIsInProgress(challengeId));

        Challenge storage challenge = challenges[challengeId];

        Sheltering sheltering = context().sheltering();
        require(!sheltering.isSheltering(msg.sender, challenge.bundleId));
   
        sheltering.addShelterer(challenge.bundleId, msg.sender);

        uint feeToTransfer = challenge.fee;
        emit ChallengeResolved(challenge.sheltererId, challenge.bundleId, challengeId, msg.sender);
        removeChallengeOrDecreaseActiveCount(challengeId);
        msg.sender.transfer(feeToTransfer);
    }

    function markAsExpired(bytes32 challengeId) public {
        require(challengeIsInProgress(challengeId));
        require(challengeIsTimedOut(challengeId));
        
        Challenge storage challenge = challenges[challengeId];

        StakeStore stakeStore = context().stakeStore();
        uint penalty = stakeStore.slash(challenge.sheltererId, challenge.challengerId);

        Sheltering sheltering = context().sheltering();
        sheltering.removeShelterer(challenge.bundleId, challenge.sheltererId);

        uint feeToReturn = challenge.fee;
        address challengerId = challenge.challengerId;
        emit ChallengeTimeout(challenge.sheltererId, challenge.bundleId, challengeId, penalty);
        delete challenges[challengeId];
        challengerId.transfer(feeToReturn);
    }

    function challengeIsTimedOut(bytes32 challengeId) public view returns(bool) {
        Config config = context().config();
        Time time = context().time();
        return time.currentTimestamp() > challenges[challengeId].creationTime + config.CHALLENGE_DURATION();
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
        return challenges[challengeId].fee;
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
        uint endTime = bundleStore.getExpirationDate(bundleId);
        Time time = context().time();
        require(endTime > time.currentTimestamp());
    }

    function validateFeeAmount(uint8 challengesCount, bytes32 bundleId) private view {
        BundleStore bundleStore = context().bundleStore();
        uint units = bundleStore.getShelteringDurationUnits(bundleId);
        Fees fees = context().fees();
        uint fee = fees.getFeeForChallenge(units);
        require(msg.value >= fee * challengesCount);
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
}
