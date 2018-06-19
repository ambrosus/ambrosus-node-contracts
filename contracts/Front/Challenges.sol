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

    event ChallengeCreated(address sheltererId, bytes32 bundleId, bytes32 challengeId);
    event SystemChallengesCreated(address sheltererId, bytes32 bundleId, bytes32 challengeId, uint count);

    mapping(bytes32 => Challenge) public challenges;
    bytes32[] public challengeIds;

    constructor(Head _head) public Base(_head) { }

    function start(address sheltererId, bytes32 bundleId) public payable {
        uint fee = validateChallengeAndGetFee(sheltererId, bundleId);
        require(msg.value >= fee);

        Challenge memory challenge = Challenge(sheltererId, bundleId, msg.sender, msg.value, now, 1);
        bytes32 challengeId = storeChallenge(challenge);

        emit ChallengeCreated(sheltererId, bundleId, challengeId);
    }

    function startForSystem(address sheltererId, bytes32 bundleId, uint8 challengesCount) public onlyContextInternalCalls payable {
        uint fee = validateChallengeAndGetFee(sheltererId, bundleId);
        require(msg.value >= fee * challengesCount);

        Challenge memory challenge = Challenge(sheltererId, bundleId, 0x0, msg.value, now, challengesCount);
        bytes32 challengeId = storeChallenge(challenge);

        emit SystemChallengesCreated(sheltererId, bundleId, challengeId, challengesCount);
    }

    function getChallengeId(address sheltererId, bytes32 bundleId) public pure returns(bytes32) {
        return keccak256(abi.encodePacked(sheltererId, bundleId));
    }

    function getChallengeIds() public view returns(bytes32[]) {
        return challengeIds;
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

    function inProgress(address sheltererId, bytes32 bundleId) public view returns (bool) {
        return getActiveChallengesCount(getChallengeId(sheltererId, bundleId)) > 0;
    }

    function validateChallengeAndGetFee(address sheltererId, bytes32 bundleId) private view returns (uint) {
        require(!inProgress(sheltererId, bundleId));
        Sheltering sheltering = context().sheltering();
        require(sheltering.isSheltering(sheltererId, bundleId));
        uint startTime = sheltering.getBundleUploadDate(bundleId);
        uint endTime = sheltering.getBundleExpirationDate(bundleId);
        // Note: cannot commit challenge after bundle has expired
        require(endTime > now);

        Fees fees = context().fees();
        return fees.getFeeForChallenge(startTime, endTime);
    }

    function storeChallenge(Challenge challenge) private returns(bytes32) {
        bytes32 challengeId = getChallengeId(challenge.sheltererId, challenge.bundleId);
        if (challenges[challengeId].creationTime == 0) {
            challengeIds.push(challengeId);
        }
        challenges[challengeId] = challenge;
        return challengeId;
    }
}
