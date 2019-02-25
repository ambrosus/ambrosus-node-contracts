/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../Lib/SafeMathExtensions.sol";


contract ChallengesStore is Base {

    using SafeMath for uint8;
    using SafeMath for uint32;
    using SafeMathExtensions for uint;

    struct Challenge {
        address sheltererId;
        bytes32 bundleId;
        address challengerId;
        uint feePerChallenge;
        uint64 creationTime;
        uint8 activeCount;
        uint sequenceNumber;
    }

    mapping(bytes32 => Challenge) challenges;
    mapping(bytes32 => uint32) activeChallengesOnBundleCount;
    uint nextChallengeSequenceNumber;

    constructor(Head _head) public Base(_head){
        nextChallengeSequenceNumber = 1;
    }

    function() public payable {}

    function store(
        address sheltererId,
        bytes32 bundleId,
        address challengerId,
        uint feePerChallenge,
        uint64 creationTime,
        uint8 activeCount)
    public payable onlyContextInternalCalls returns (bytes32)
    {
        bytes32 challengeId = getChallengeId(sheltererId, bundleId);
        challenges[challengeId] = Challenge(sheltererId, bundleId, challengerId, feePerChallenge, creationTime, activeCount, nextChallengeSequenceNumber);
        activeChallengesOnBundleCount[bundleId] = activeChallengesOnBundleCount[bundleId].add(activeCount).castTo32();
        incrementNextChallengeSequenceNumber(activeCount);
        return challengeId;
    }

    function remove(bytes32 challengeId) public onlyContextInternalCalls {
        activeChallengesOnBundleCount[challenges[challengeId].bundleId] = activeChallengesOnBundleCount[
            challenges[challengeId].bundleId].sub(challenges[challengeId].activeCount).castTo32();
        delete challenges[challengeId];
    }

    function transferFee(address refundAddress, uint amountToReturn) public onlyContextInternalCalls {
        refundAddress.transfer(amountToReturn);
    }

    function getChallenge(bytes32 challengeId) public view returns (address, bytes32, address, uint, uint64, uint8, uint) {
        Challenge storage challenge = challenges[challengeId];
        return (
        challenge.sheltererId,
        challenge.bundleId,
        challenge.challengerId,
        challenge.feePerChallenge,
        challenge.creationTime,
        challenge.activeCount,
        challenge.sequenceNumber
        );
    }

    function getChallengeId(address sheltererId, bytes32 bundleId) public view onlyContextInternalCalls returns (bytes32) {
        return keccak256(abi.encodePacked(sheltererId, bundleId));
    }

    function decreaseActiveCount(bytes32 challengeId) public onlyContextInternalCalls {
        activeChallengesOnBundleCount[challenges[challengeId].bundleId] = activeChallengesOnBundleCount[
            challenges[challengeId].bundleId].sub(1).castTo32();
        challenges[challengeId].activeCount = challenges[challengeId].activeCount.sub(1).castTo8();
        challenges[challengeId].sequenceNumber++;
    }

    function getActiveChallengesOnBundleCount(bytes32 bundleId) public view onlyContextInternalCalls returns (uint32) {
        return activeChallengesOnBundleCount[bundleId];
    }

    function getNextChallengeSequenceNumber() public view onlyContextInternalCalls returns (uint) {
        return nextChallengeSequenceNumber;
    }

    function incrementNextChallengeSequenceNumber(uint amount) private {
        nextChallengeSequenceNumber += amount;
    }
}
