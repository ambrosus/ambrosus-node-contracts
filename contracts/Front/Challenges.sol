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

    mapping(bytes32 => Challenge) public challenges;

    constructor(Head _head) public Base(_head) { }

    function start(address sheltererId, bytes32 bundleId) public payable {
        validateChallenge(sheltererId, bundleId);
        validateFeeAmount(1, bundleId);

        Challenge memory challenge = Challenge(sheltererId, bundleId, msg.sender, msg.value, now, 1);
        bytes32 challengeId = storeChallenge(challenge);

        emit ChallengeCreated(sheltererId, bundleId, challengeId, 1);
    }

    function startForSystem(address sheltererId, bytes32 bundleId, uint8 challengesCount) public onlyContextInternalCalls payable {
        validateChallenge(sheltererId, bundleId);
        validateFeeAmount(challengesCount, bundleId);

        Challenge memory challenge = Challenge(sheltererId, bundleId, 0x0, msg.value, now, challengesCount);
        bytes32 challengeId = storeChallenge(challenge);

        emit ChallengeCreated(sheltererId, bundleId, challengeId, challengesCount);
    }

    function resolve(bytes32 challengeId) public {
        require(challengeIsInProgress(challengeId));

        Challenge storage challenge = challenges[challengeId];

        Sheltering sheltering = context().sheltering();
        require(!sheltering.isSheltering(msg.sender, challenge.bundleId));

        StakeStore stakeStore = context().stakeStore();
        require(stakeStore.canStore(msg.sender));

        BundleStore bundleStore = context().bundleStore();
        bundleStore.addShelterer(challenge.bundleId, msg.sender);

        msg.sender.transfer(challenge.fee);
        emit ChallengeResolved(challenge.sheltererId, challenge.bundleId, challengeId, msg.sender);
        removeChallengeOrDecreaseActiveCount(challengeId);
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
        require(endTime > now);
    }

    function validateFeeAmount(uint8 challengesCount, bytes32 bundleId) private view {
        BundleStore bundleStore = context().bundleStore();
        uint startTime = bundleStore.getUploadDate(bundleId);
        uint endTime = bundleStore.getExpirationDate(bundleId);
        Fees fees = context().fees();
        uint fee = fees.getFeeForChallenge(startTime, endTime);
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
