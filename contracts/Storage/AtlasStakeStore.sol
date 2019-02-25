/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../Lib/SafeMathExtensions.sol";
import "../Boilerplate/Head.sol";


contract AtlasStakeStore is Base {

    using SafeMath for uint;
    using SafeMath for uint32;
    using SafeMathExtensions for uint;

    struct Stake {
        uint initialAmount;
        uint amount;
        uint shelteredBundlesCount;
        uint64 lastPenaltyTime;
        uint penaltiesCount;
        uint lastChallengeResolvedSequenceNumber;
    }

    mapping (address => Stake) stakes;
    address[] stakesIndex;
    mapping (uint => address[]) stakesIndexGrouped;

    constructor(Head _head) public Base(_head) {}

    function isStaking(address node) public view returns (bool) {
        return stakes[node].initialAmount > 0;
    }

    function getNumberOfStakers() public view returns (uint32) {
        return stakesIndex.length.castTo32();
    }

    function getNumberOfStakersWithStake(uint initialAmount) public view returns (uint32) {
        return stakesIndexGrouped[initialAmount].length.castTo32();
    }

    function getStakerAtIndex(uint32 inx) public view returns (address) {
        return stakesIndex[inx];
    }

    function getStakerWithStakeAtIndex(uint initialAmount, uint32 inx) public view returns (address) {
        return stakesIndexGrouped[initialAmount][inx];
    }

    function getShelteredBundlesCount(address node) public view returns (uint) {
        return stakes[node].shelteredBundlesCount;
    }

    function getStake(address node) public view returns (uint) {
        return stakes[node].amount;
    }

    function isShelteringAny(address node) public view returns (bool) {
        return stakes[node].shelteredBundlesCount > 0;
    }

    function getBasicStake(address node) public view returns (uint) {
        return stakes[node].initialAmount;
    }

    function depositStake(address _who) public payable onlyContextInternalCalls {
        require(!isStaking(_who));

        stakes[_who].initialAmount = msg.value;
        stakes[_who].amount = msg.value;
        stakes[_who].shelteredBundlesCount = 0;
        stakesIndex.push(_who);
        stakesIndexGrouped[msg.value].push(_who);
    }

    function releaseStake(address node, address refundAddress) public onlyContextInternalCalls returns(uint) {
        require(isStaking(node));
        require(refundAddress != address(0));
        require(!isShelteringAny(node));

        uint amount = stakes[node].amount;
        
        for (uint inx1 = 0; inx1 < stakesIndex.length; ++inx1) {
            if (stakesIndex[inx1] == node) {
                stakesIndex[inx1] = stakesIndex[stakesIndex.length-1];
                break;
            }
        }
        --stakesIndex.length;

        address[] storage indexGroup = stakesIndexGrouped[stakes[node].initialAmount];
        for (uint inx2 = 0; inx2 < indexGroup.length; ++inx2) {
            if (indexGroup[inx2] == node) {
                indexGroup[inx2] = indexGroup[indexGroup.length-1];
                break;
            }
        }
        --indexGroup.length;

        stakes[node].initialAmount = 0;
        stakes[node].amount = 0;
        stakes[node].shelteredBundlesCount = 0;        
        refundAddress.transfer(amount);
        return amount;
    }

    function slash(address shelterer, address refundAddress, uint penaltyAmount)
        public onlyContextInternalCalls returns(uint)
    {
        require(isStaking(shelterer));

        uint slashedAmount;
        if (penaltyAmount > stakes[shelterer].amount) {
            slashedAmount = stakes[shelterer].amount;
        } else {
            slashedAmount = penaltyAmount;
        }
        stakes[shelterer].amount = stakes[shelterer].amount.sub(slashedAmount);
        refundAddress.transfer(slashedAmount);
        return slashedAmount;
    }

    function decrementShelteredBundlesCount(address node) public onlyContextInternalCalls {
        require(isShelteringAny(node));
        stakes[node].shelteredBundlesCount = stakes[node].shelteredBundlesCount.sub(1);
    }

    function incrementShelteredBundlesCount(address node) public onlyContextInternalCalls {
        stakes[node].shelteredBundlesCount = stakes[node].shelteredBundlesCount.add(1);
    }

    function getPenaltiesHistory(address node) public view returns (uint penaltiesCount, uint64 lastPenaltyTime) {
        penaltiesCount = stakes[node].penaltiesCount;
        lastPenaltyTime = stakes[node].lastPenaltyTime;
    }

    function setPenaltyHistory(address shelterer, uint penaltiesCount, uint64 currentTimestamp) public onlyContextInternalCalls {
        stakes[shelterer].penaltiesCount = penaltiesCount;
        stakes[shelterer].lastPenaltyTime = currentTimestamp;
    }

    function getLastChallengeResolvedSequenceNumber(address node) public view returns (uint) {
        return stakes[node].lastChallengeResolvedSequenceNumber;
    }

    function updateLastChallengeResolvedSequenceNumber(address node, uint updatedLastChallengeResolvedSequenceNumber) public onlyContextInternalCalls {
        require(isStaking(node));
        stakes[node].lastChallengeResolvedSequenceNumber = updatedLastChallengeResolvedSequenceNumber;
    }
}
