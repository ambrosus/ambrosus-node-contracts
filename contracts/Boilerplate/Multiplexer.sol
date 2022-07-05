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
import "../Pool/PoolsNodesManager.sol";
import "../Multisig/RolesScope.sol";

contract Multiplexer is ConstructorOwnable {
    Head public head;
    KycWhitelist public kycWhitelist;
    Fees public fees;
    ValidatorProxy public validatorProxy;
    Roles public roles;
    PoolsNodesManager public poolsNodesManager;
    RolesScopes public rolesScopes;

    // add rolescope
    constructor(
        address _owner,
        Head _head,
        KycWhitelist _kycWhitelist,
        Fees _fees,
        ValidatorProxy _validatorProxy,
        Roles _roles,
        PoolsNodesManager _poolsNodesManager,
        RolesScopes _rolesScopes
    ) public ConstructorOwnable(_owner) {
        head = _head;
        kycWhitelist = _kycWhitelist;
        fees = _fees;
        validatorProxy = _validatorProxy;
        roles = _roles;
        poolsNodesManager = _poolsNodesManager;
        rolesScopes = _rolesScopes;
    }

    modifier isAdmin(address user) {
        require(rolesScopes.hasRole(0x00, user), "Caller is not an admin");
        _;
    }

    function transferContractsOwnership(address newOwner) public onlyOwner {
        head.transferOwnership(newOwner);
        kycWhitelist.transferOwnership(newOwner);
        fees.transferOwnership(newOwner);
        validatorProxy.transferOwnership(newOwner);
        roles.transferOwnership(newOwner);
    }

    function changeContext(Context context) public onlyOwner {
        head.setContext(context);
    }

    function addToWhitelist(
        address candidate,
        Consts.NodeType role,
        uint256 deposit
    ) public onlyOwner {
        kycWhitelist.add(candidate, role, deposit);
    }

    function removeFromWhitelist(address candidate) public onlyOwner {
        kycWhitelist.remove(candidate);
    }

    function setBaseUploadFee(uint256 fee) public onlyOwner {
        fees.setBaseUploadFee(fee);
    }

    function transferOwnershipForValidatorSet(address newOwner)
        public
        onlyOwner
    {
        validatorProxy.transferOwnershipForValidatorSet(newOwner);
    }

    function transferOwnershipForBlockRewards(address newOwner)
        public
        onlyOwner
    {
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

    function addAdmin(address _admin) public onlyOwner {
        fees.addAdmin(_admin);
    }

    function removeAdmin(address _admin) public onlyOwner {
        fees.removeAdmin(_admin);
    }

    function addPool(address _pool) public onlyOwner {
        poolsNodesManager.addPool(_pool);
    }

    function removePool(address _pool) public onlyOwner {
        poolsNodesManager.removePool(_pool);
    }

    function setUserRole(string roleName, address user)
        public
        isAdmin(msg.sender)
    {
        rolesScopes._grantRole(rolesScopes.getRoleHexByName(roleName), user);
    }

    function revokeUserRole(string roleName, address user)
        public
        isAdmin(msg.sender)
    {
        rolesScopes.revokeRole(rolesScopes.getRoleHexByName(roleName), user);
    }
}
