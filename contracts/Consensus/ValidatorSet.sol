/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.22;

// From: https://wiki.parity.io/Validator-Set.html
contract ValidatorSetBase {
    event InitiateChange(bytes32 indexed parentHash, address[] newSet);

    function getValidators() public view returns (address[]); 
    function finalizeChange() public;
}

/**
@title Implementation of Parities ValidatorSet contract with:
- simple add/remove methods
- only owner (set explicitly in constructor and transferable) can perform mutating functions
*/
contract ValidatorSet is ValidatorSetBase {
    address public owner;
    // the SUPER_USER address as defined by EIP96. During normal operation should be 2**160 - 2
    address private super_user;
    address[] public validators;
    address[] public pendingValidators;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0));
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function checkInArray(address _subject, address[] _array) private pure returns(bool) {
        for (uint i = 0; i < _array.length; ++i) {
            if (_array[i] == _subject) {
                return true;
            }
        }
        return false;
    }

    modifier inArray(address _subject, address[] _array) {
        require(checkInArray(_subject, _array));
        _;
    }

    modifier notInArray(address _subject, address[] _array) {
        require(!checkInArray(_subject, _array));
        _;
    }

    /**
    @notice Constructor
    @param _owner the owner of this contract.
    @param _initialValidators the initial set of validator addresses.
    @param _super_user SUPER_USER address value injectable for test purpouses. Under normal operation it should be set to 2^160-2 as defined in EIP96 
    */
    constructor(address _owner, address[] _initialValidators, address _super_user) public {
        owner = _owner;
        super_user = _super_user;
        validators = _initialValidators;
        pendingValidators = _initialValidators;
    }

    function getValidators() public view returns (address[]) {
        return validators;
    }

    function getPendingValidators() public view returns (address[]) {
        return pendingValidators;
    }

    function addValidator(address _validator) public onlyOwner notInArray(_validator, pendingValidators) {
        pendingValidators.push(_validator);    
        emitChangeEvent();
    }

    function removeValidator(address _validator) public onlyOwner inArray(_validator, pendingValidators) {
        for (uint i = 0; i < pendingValidators.length; ++i) {
            if (pendingValidators[i] == _validator) {
                pendingValidators[i] = pendingValidators[pendingValidators.length - 1];
                delete pendingValidators[pendingValidators.length - 1];
                pendingValidators.length--;
            }
        }
        emitChangeEvent();
    }

    function finalizeChange() public {
        require(msg.sender == super_user);
        validators = pendingValidators;
    }

    function emitChangeEvent() private {
        /* solium-disable-next-line security/no-block-members */
        emit InitiateChange(blockhash(block.number - 1), pendingValidators);
    }
}