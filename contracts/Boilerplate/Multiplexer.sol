/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Configuration/Consts.sol";
import "../Boilerplate/Head.sol";
import "../Front/KycWhitelist.sol";
import "../Front/Roles.sol";
import "../Configuration/Fees.sol";
import "../Middleware/ValidatorProxy.sol";


contract Multiplexer is ConstructorOwnable {
    Head public head;
    KycWhitelist public kycWhitelist;
    Fees public fees;
    ValidatorProxy public validatorProxy;
    Roles private roles;

    constructor(
        address _owner,
        Head _head,
        KycWhitelist _kycWhitelist,
        Fees _fees,
        ValidatorProxy _validatorProxy,
        Roles _roles
    )
    public ConstructorOwnable(_owner)
    {
        head = _head;
        kycWhitelist = _kycWhitelist;
        fees = _fees;
        validatorProxy = _validatorProxy;
        roles = _roles;
    }

    function transferContractsOwnership(address newOwner) public onlyOwner {
        head.transferOwnership(newOwner);
        kycWhitelist.transferOwnership(newOwner);
        fees.transferOwnership(newOwner);
        validatorProxy.transferOwnership(newOwner);
    }

    function changeContext(Context context) public onlyOwner {
        head.setContext(context);
    }

    function addToWhitelist(address candidate, Consts.NodeType role, uint deposit) public onlyOwner {
        kycWhitelist.add(candidate, role, deposit);
    }

    function removeFromWhitelist(address candidate) public onlyOwner {
        kycWhitelist.remove(candidate);
    }

    function setBaseUploadFee(uint fee) public onlyOwner {
        fees.setBaseUploadFee(fee);
    }

    function transferOwnershipForValidatorSet(address newOwner) public onlyOwner {
        validatorProxy.transferOwnershipForValidatorSet(newOwner);
    }

    function transferOwnershipForBlockRewards(address newOwner) public onlyOwner {
        validatorProxy.transferOwnershipForBlockRewards(newOwner);
    }

    function setBaseReward(uint256 _baseReward) public onlyOwner {
        validatorProxy.setBaseReward(_baseReward);
    }

    function retireApollo(address apollo) public onlyOwner {
        roles.retireApollo(apollo);
    }

    function setDeveloperFee(uint256 _developerFee) public onlyOwner {
        fees.setDeveloperFee(_developerFee);
        fees.setDeveloperUploadFee(_developerFee);
    }

    function setDeveloper(address _developer) public onlyOwner {
        fees.setDeveloper(_developer);
    }

    function setSupportFee(address _support, uint256 _fee) public onlyOwner {
        fees.setSupport(_support);
        fees.setSupportFee(_fee);
    }
}
