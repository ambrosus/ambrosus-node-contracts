/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.22;

import "./ConstructorOwnable.sol";


// From: https://wiki.parity.io/Validator-Set.html
contract ValidatorSetBase {
    event InitiateChange(bytes32 indexed parentHash, address[] newSet);

    function getValidators() public view returns (address[]); 
    // Called by the `SUPER_USER` in response of to a InitiateChange event.    
    function finalizeChange() public;
}


/**
@title Implementation of Parities ValidatorSet contract with:
- simple add/remove methods
- only owner (set explicitly in constructor and transferable) can perform mutating functions
*/
contract ValidatorSet is ValidatorSetBase, ConstructorOwnable {
    address private superUser; // the SUPER_USER address as defined by EIP96. During normal operation should be 2**160 - 2
    address[] public validators;
    address[] public pendingValidators;

    /**
    @notice Constructor
    @param _owner the owner of this contract, that can add/remove validators.
    @param _initialValidators the initial set of validator addresses.
    @param _superUser SUPER_USER address value injectable for test purpouses. Under normal operation it should be set to 2^160-2 as defined in EIP96 
    */
    constructor(address _owner, address[] _initialValidators, address _superUser) public ConstructorOwnable(_owner) {
        require(_initialValidators.length > 0);
        require(_superUser != address(0));
        superUser = _superUser;
        validators = _initialValidators;
        pendingValidators = _initialValidators;
    }

    modifier inArray(address _subject, address[] _array, string _message) {
        require(checkInArray(_subject, _array), _message);
        _;
    }

    modifier notInArray(address _subject, address[] _array, string _message) {
        require(!checkInArray(_subject, _array), _message);
        _;
    }

    function getValidators() public view returns (address[]) {
        return validators;
    }

    function getPendingValidators() public view returns (address[]) {
        return pendingValidators;
    }

    function addValidator(address _validator) public onlyOwner notInArray(_validator, pendingValidators, "Provided address is already a validator") {
        pendingValidators.push(_validator);    
        emitChangeEvent();
    }

    function removeValidator(address _validator) public onlyOwner inArray(_validator, pendingValidators, "Provided address is not a validator") {
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
        require(msg.sender == superUser, "Must be called by super user");
        validators = pendingValidators;
    }

    function emitChangeEvent() private {
        /* solium-disable-next-line security/no-block-members */
        emit InitiateChange(blockhash(block.number - 1), pendingValidators);
    }

    function checkInArray(address _subject, address[] _array) private pure returns(bool) {
        for (uint i = 0; i < _array.length; ++i) {
            if (_array[i] == _subject) {
                return true;
            }
        }
        return false;
    }
}
