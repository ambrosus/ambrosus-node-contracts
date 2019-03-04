/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Configuration/Consts.sol";
import "../Configuration/Config.sol";
import "../Boilerplate/Head.sol";
import "../Front/KycWhitelist.sol";
import "../Middleware/ValidatorProxy.sol";
import "../Storage/AtlasStakeStore.sol";
import "../Storage/RolesStore.sol";
import "../Storage/ApolloDepositStore.sol";
import "../Storage/RolesEventEmitter.sol";


contract Roles is Base {

    AtlasStakeStore private atlasStakeStore;
    RolesStore private rolesStore;
    ApolloDepositStore private apolloDepositStore;
    ValidatorProxy private validatorProxy;
    KycWhitelist private kycWhitelist;
    Config private config;
    RolesEventEmitter private rolesEventEmitter;

    constructor(
        Head _head,
        AtlasStakeStore _atlasStakeStore,
        RolesStore _rolesStore,
        ApolloDepositStore _apolloDepositStore,
        ValidatorProxy _validatorProxy,
        KycWhitelist _kycWhitelist,
        Config _config,
        RolesEventEmitter _rolesEventEmitter
    ) 
        public Base(_head) 
    { 
        atlasStakeStore = _atlasStakeStore;
        rolesStore = _rolesStore;
        apolloDepositStore = _apolloDepositStore;
        validatorProxy = _validatorProxy;
        kycWhitelist = _kycWhitelist;
        config = _config;
        rolesEventEmitter = _rolesEventEmitter;
    }

    function() public payable {}

    function onboardAsAtlas(string nodeUrl) public payable {
        require(canOnboard(msg.sender, Consts.NodeType.ATLAS, msg.value));

        atlasStakeStore.depositStake.value(msg.value)(msg.sender);
        rolesStore.setRole(msg.sender, Consts.NodeType.ATLAS);
        rolesStore.setUrl(msg.sender, nodeUrl);

        rolesEventEmitter.nodeOnboarded(msg.sender, msg.value, nodeUrl, Consts.NodeType.ATLAS);
    }

    function onboardAsApollo() public payable {
        require(canOnboard(msg.sender, Consts.NodeType.APOLLO, msg.value));

        apolloDepositStore.storeDeposit.value(msg.value)(msg.sender);
        rolesStore.setRole(msg.sender, Consts.NodeType.APOLLO);
        validatorProxy.addValidator(msg.sender, msg.value);

        rolesEventEmitter.nodeOnboarded(msg.sender, msg.value, "", Consts.NodeType.APOLLO);
    }

    function onboardAsHermes(string nodeUrl) public {
        require(canOnboard(msg.sender, Consts.NodeType.HERMES, 0));

        rolesStore.setRole(msg.sender, Consts.NodeType.HERMES);
        rolesStore.setUrl(msg.sender, nodeUrl);

        rolesEventEmitter.nodeOnboarded(msg.sender, 0, nodeUrl, Consts.NodeType.HERMES);
    }

    function retireAtlas() public {
        retire(msg.sender, Consts.NodeType.ATLAS);

        uint amountToTransfer = atlasStakeStore.releaseStake(msg.sender, this);

        rolesEventEmitter.nodeRetired(msg.sender, amountToTransfer, Consts.NodeType.ATLAS);

        msg.sender.transfer(amountToTransfer);
    }

    function retireApollo() public {
        retire(msg.sender, Consts.NodeType.APOLLO);

        uint amountToTransfer = apolloDepositStore.releaseDeposit(msg.sender, this);
        validatorProxy.removeValidator(msg.sender);

        rolesEventEmitter.nodeRetired(msg.sender, amountToTransfer, Consts.NodeType.APOLLO);

        msg.sender.transfer(amountToTransfer);
    }

    function retireHermes() public {
        retire(msg.sender, Consts.NodeType.HERMES);

        rolesEventEmitter.nodeRetired(msg.sender, 0, Consts.NodeType.HERMES);
    }

    function getOnboardedRole(address node) public view returns (Consts.NodeType) {
        return rolesStore.getRole(node);
    }

    function getUrl(address node) public view returns (string) {
        return rolesStore.getUrl(node);
    }

    function setUrl(string nodeUrl) public {
        string memory oldUrl = getUrl(msg.sender);
        rolesStore.setUrl(msg.sender, nodeUrl);
        string memory newUrl = getUrl(msg.sender);
        rolesEventEmitter.nodeUrlChanged(msg.sender, oldUrl, newUrl);
    }

    function canOnboard(address node, Consts.NodeType role, uint amount) public view returns (bool) {
        if (role == Consts.NodeType.APOLLO) {
            return kycWhitelist.hasRoleAssigned(node, role) && amount >= kycWhitelist.getRequiredDeposit(node);
        }
        return kycWhitelist.hasRoleAssigned(node, role) && amount == kycWhitelist.getRequiredDeposit(node);
    }

    function retire(address node, Consts.NodeType role) private {
        require(rolesStore.getRole(node) == role);

        if (role == Consts.NodeType.ATLAS || role == Consts.NodeType.HERMES) {
            rolesStore.setUrl(node, "");
        }
        rolesStore.setRole(node, Consts.NodeType.NONE);
    }
}
