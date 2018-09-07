/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.22;

import "./BlockRewards.sol";
import "./ValidatorSet.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


/**
@title Proxy for ValidtorSet and BlockRewards contracts. Providing a unified api and single point of interaction.
*/
contract ValidatorProxy is Ownable {

    ValidatorSet public validatorSet;
    BlockRewards public blockRewards;

    /**
    @notice Constructor
    
    */
    constructor(ValidatorSet _validatorSet, BlockRewards _blockRewards) public Ownable(){
        validatorSet = _validatorSet;
        blockRewards = _blockRewards;
    }

    function transferOwnershipForValidatorSet(address newOwner) public onlyOwner {
        validatorSet.transferOwnership(newOwner);
    }

    function transferOwnershipForBlockRewards(address newOwner) public onlyOwner {
        blockRewards.transferOwnership(newOwner);
    }

    function addValidator(address validator, uint256 deposit) public onlyOwner {
        address[] memory registeredValidators = validatorSet.getPendingValidators();
        if (!checkInArray(validator, registeredValidators)) {
            validatorSet.addValidator(validator);
        }

        if (!blockRewards.isBeneficiary(validator)) {
            blockRewards.addBeneficiary(validator, deposit);
        } else {
            require(blockRewards.beneficiaryShare(validator) == deposit);
        }
    }

    function removeValidator(address validator) public onlyOwner {
        address[] memory registeredValidators = validatorSet.getPendingValidators();
        if (checkInArray(validator, registeredValidators)) {
            validatorSet.removeValidator(validator);
        }

        if (blockRewards.isBeneficiary(validator)) {
            blockRewards.removeBeneficiary(validator);
        }
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