/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";

contract StakeStore is Base {
  
  struct Stake {
    uint amount;
    uint storageLimit;
    uint storageLeft;
    NodeType role;
  }

  enum NodeType {ATLAS, HERMES, APOLLO}

  mapping (address => Stake) stakes;

  constructor(Head _head) public Base(_head) {    
  }

  function despositStake(uint _storageLimit, NodeType _role) public payable {
    require(!isStaking(msg.sender));
    stakes[msg.sender] = Stake(msg.value, _storageLimit, _storageLimit, _role);
  }

  function releaseStake() public {    
    require(isStaking(msg.sender));
    require(!isShelteringAny(msg.sender));
    uint amount = stakes[msg.sender].amount;
    delete stakes[msg.sender];
    msg.sender.transfer(amount);
  }

  function isStaking(address node) public view returns (bool) {
    return stakes[node].amount > 0;
  }

  function canStore(address node) public view returns (bool)  {
    return stakes[node].storageLeft > 0;
  }

  function getStorageLeft(address node) public view returns (uint)  {
    return stakes[node].storageLeft;
  }

  function getStake(address node) public view returns (uint)  {
    return stakes[node].amount;
  }  
  function isShelteringAny(address node) view public returns (bool) {
    return stakes[node].storageLeft < stakes[node].storageLimit;
  }

  function decreaseStorage(address node) public onlyContextInternalCalls {
    require(stakes[node].storageLeft > 0);
    stakes[node].storageLeft -= 1;
  }

  function slash(address shelterer, address challanger, uint amount) public {
    require(isStaking(shelterer));
    uint slashedAmount;
    if (amount > stakes[shelterer].amount) 
      slashedAmount = stakes[shelterer].amount;
    else
      slashedAmount = amount;
    stakes[shelterer].amount -= slashedAmount;
    challanger.transfer(slashedAmount);
  }

}