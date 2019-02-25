/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.22;


/**
@title Only owner base contract. Instead of assuming the owner is the contract deployer, it takes the owner address as a constructor parameter.
*/
contract ConstructorOwnable {
    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
    @notice Constructor
    @param _owner the owner of this contract, that can add/remove validators.
    */
    constructor(address _owner) public {
        require(_owner != address(0));
        owner = _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Sender must be owner");
        _;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner must not be 0x0");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
