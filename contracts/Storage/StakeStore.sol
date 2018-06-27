/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../Boilerplate/Head.sol";
import "../Configuration/Roles.sol";


contract StakeStore is Base {
  
    using SafeMath for uint;

    struct Stake {
        uint initialAmount;
        uint amount;
        uint storageLimit;
        uint storageUsed;
        Roles.NodeType role;
        uint lastPenaltyTime;
        uint penaltiesCount;
    }

    mapping (address => Stake) stakes;

    constructor(Head _head) public Base(_head) {    
    }

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

    function getRole(address node) public view returns (Roles.NodeType) {
        return stakes[node].role;
    }

    function getPenaltiesHistory(address node) public view returns (uint lastPenaltyTime, uint penaltiesCount) {
        lastPenaltyTime = stakes[node].lastPenaltyTime;
        penaltiesCount = stakes[node].penaltiesCount;
    }

    function isShelteringAny(address node) view public returns (bool) {
        return stakes[node].storageUsed > 0;
    }
    
    function getBasicStake(address node) public view returns (uint) {
        return stakes[node].initialAmount;
    }

    function depositStake(address _who, uint _storageLimit, Roles.NodeType _role) public payable onlyContextInternalCalls {
        require(!isStaking(_who));
        stakes[_who] = Stake(msg.value, msg.value, _storageLimit, 0, _role, 0, 0);
    }

    function releaseStake(address node) public onlyContextInternalCalls {    
        require(isStaking(node));
        require(!isShelteringAny(node));
        uint amount = stakes[node].amount;
        delete stakes[node];
        node.transfer(amount);
    }

    function incrementStorageUsed(address node) public onlyContextInternalCalls {
        require(stakes[node].storageUsed < stakes[node].storageLimit);
        stakes[node].storageUsed = stakes[node].storageUsed.add(1);
    }

    function slash(address shelterer, address challenger, uint amount, uint penaltiesCount) public onlyContextInternalCalls {
        require(isStaking(shelterer));
        setPenaltyHistory(shelterer, penaltiesCount);
        uint slashedAmount;
        if (amount > stakes[shelterer].amount) {
            slashedAmount = stakes[shelterer].amount;
        } else {
            slashedAmount = amount;
        }
        stakes[shelterer].amount = stakes[shelterer].amount.sub(slashedAmount);
        challenger.transfer(slashedAmount);
    }

    function setPenaltyHistory(address shelterer, uint penaltiesCount) private {
        stakes[shelterer].lastPenaltyTime = now;
        stakes[shelterer].penaltiesCount = penaltiesCount;
    }
}
