/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../Boilerplate/Head.sol";
import "../Configuration/Fees.sol";


contract AtlasStakeStore is Base {

    using SafeMath for uint;

    struct Stake {
        uint initialAmount;
        uint amount;
        uint storageLimit;
        uint storageUsed;
        uint64 lastPenaltyTime;
        uint penaltiesCount;
        uint lastChallengeResolvedSequenceNumber;
    }

    mapping (address => Stake) stakes;

    constructor(Head _head) public Base(_head) {}

    function isStaking(address node) public view returns (bool) {
        return stakes[node].amount > 0;
    }

    function canStore(address node) public view returns (bool) {
        return stakes[node].storageUsed < stakes[node].storageLimit;
    }

    function getStorageUsed(address node) public view returns (uint) {
        return stakes[node].storageUsed;
    }

    function getStorageLimit(address node) public view returns (uint) {
        return stakes[node].storageLimit;
    }

    function getStake(address node) public view returns (uint) {
        return stakes[node].amount;
    }

    function isShelteringAny(address node) public view returns (bool) {
        return stakes[node].storageUsed > 0;
    }

    function getLastChallengeResolvedSequenceNumber(address node) public view returns (uint) {
        return stakes[node].lastChallengeResolvedSequenceNumber;
    }

    function getBasicStake(address node) public view returns (uint) {
        return stakes[node].initialAmount;
    }

    function depositStake(address _who, uint _storageLimit) public payable onlyContextInternalCalls {
        require(!isStaking(_who));
        stakes[_who] = Stake(msg.value, msg.value, _storageLimit, 0, 0, 0, 0);
    }

    function updateLastChallengeResolvedSequenceNumber(address node, uint updatedLastChallengeResolvedSequenceNumber) public onlyContextInternalCalls {
        require(isStaking(node));
        stakes[node].lastChallengeResolvedSequenceNumber = updatedLastChallengeResolvedSequenceNumber;
    }

    function releaseStake(address node, address refundAddress) public onlyContextInternalCalls returns(uint) {
        require(isStaking(node));
        require(!isShelteringAny(node));
        uint amount = stakes[node].amount;
        delete stakes[node];
        refundAddress.transfer(amount);
        return amount;
    }

    function decrementStorageUsed(address node) public onlyContextInternalCalls {
        require(isShelteringAny(node));
        stakes[node].storageUsed = stakes[node].storageUsed.sub(1);
    }

    function incrementStorageUsed(address node) public onlyContextInternalCalls {
        require(canStore(node));
        stakes[node].storageUsed = stakes[node].storageUsed.add(1);
    }

    function slash(address shelterer, address refundAddress, uint64 currentTimestamp) public onlyContextInternalCalls returns(uint) {
        require(isStaking(shelterer));

        (uint penaltiesCount, uint64 lastPenaltyTime) = getPenaltiesHistory(shelterer);

        Fees fees = context().fees();
        (uint amount, uint newPenaltiesCount) = fees.getPenalty(stakes[shelterer].initialAmount, penaltiesCount, lastPenaltyTime);

        setPenaltyHistory(shelterer, newPenaltiesCount, currentTimestamp);

        uint slashedAmount;
        if (amount > stakes[shelterer].amount) {
            slashedAmount = stakes[shelterer].amount;
        } else {
            slashedAmount = amount;
        }
        stakes[shelterer].amount = stakes[shelterer].amount.sub(slashedAmount);
        refundAddress.transfer(slashedAmount);
        return slashedAmount;
    }

    function getPenaltiesHistory(address node) public view returns (uint penaltiesCount, uint64 lastPenaltyTime) {
        penaltiesCount = stakes[node].penaltiesCount;
        lastPenaltyTime = stakes[node].lastPenaltyTime;
    }

    function setPenaltyHistory(address shelterer, uint penaltiesCount, uint64 currentTimestamp) private {
        stakes[shelterer].penaltiesCount = penaltiesCount;
        stakes[shelterer].lastPenaltyTime = currentTimestamp;
    }
}
