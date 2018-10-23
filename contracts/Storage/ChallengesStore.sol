/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";


contract ChallengesStore is Base {
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
        uint8 activeCount,
        uint sequenceNumber)
    public payable onlyContextInternalCalls returns (bytes32)
    {
        bytes32 challengeId = getChallengeId(sheltererId, bundleId);
        challenges[challengeId] = Challenge(sheltererId, bundleId, challengerId, feePerChallenge, creationTime, activeCount, sequenceNumber);
        return challengeId;
    }

    function remove(bytes32 challengeId) public onlyContextInternalCalls {
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

    function increaseSequenceNumber(bytes32 challengeId) public onlyContextInternalCalls {
        challenges[challengeId].sequenceNumber++;
    }

    function decreaseActiveCount(bytes32 challengeId) public onlyContextInternalCalls {
        challenges[challengeId].activeCount--;
    }

    function getNextChallengeSequenceNumber() public view onlyContextInternalCalls returns(uint) {
        return nextChallengeSequenceNumber;
    }

    function incrementNextChallengeSequenceNumber(uint amount) public onlyContextInternalCalls {
        nextChallengeSequenceNumber += amount;
    }
}
