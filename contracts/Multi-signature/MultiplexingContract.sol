/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../Front/KycWhitelist.sol";
import "../Consensus/BlockRewards.sol";
import "../Consensus/ValidatorSet.sol";


contract MultiplexingContract is Ownable {

    address[] private _controlledContracts;
    mapping (address => uint) private _indexes;

    function performTransaction(address executor, bytes memory transaction) public {
        bool res = executor.call(transaction);
        if (!res) {
            revert();
        }
    }

    function addControlledContract(address targetContract) public onlyOwner {
        require(targetContract != address(0x0));
        require(Ownable(targetContract).owner() == address(this));

        _controlledContracts.push(targetContract);
        _indexes[targetContract] = _controlledContracts.length - 1;
    }

    function removeControlledContract(address targetContract, address newOwner) public onlyOwner {
        require(targetContract != address(0x0) && newOwner != address(0x0));
        require(targetContract == _controlledContracts[_indexes[targetContract]]);
        require(Ownable(targetContract).owner() == address(this));

        Ownable(targetContract).transferOwnership(newOwner);

        uint index = _indexes[targetContract];
        _controlledContracts[index] = _controlledContracts[_controlledContracts.length - 1];
        delete _controlledContracts[_controlledContracts.length - 1];
        --_controlledContracts.length;

        _indexes[_controlledContracts[index]] = index;
    }

    function removeAllControlledContracts(address newOwner) public onlyOwner {
        require(newOwner != address(0x0));

        for (uint i = 0; i < _controlledContracts.length; ++i) {
            address targetContract = _controlledContracts[i];
            Ownable(targetContract).transferOwnership(newOwner);
            delete _indexes[targetContract];
        }
        delete _controlledContracts;
    }
}