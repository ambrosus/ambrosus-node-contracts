/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

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
import "../Storage/NodeAddressesStore.sol";


contract Roles is Base, Ownable {

    AtlasStakeStore private atlasStakeStore;
    RolesStore private rolesStore;
    ApolloDepositStore private apolloDepositStore;
    ValidatorProxy private validatorProxy;
    KycWhitelist private kycWhitelist;
    Config private config;
    RolesEventEmitter private rolesEventEmitter;
    NodeAddressesStore private nodeAddressesStore;

    constructor(
        Head _head,
        AtlasStakeStore _atlasStakeStore,
        RolesStore _rolesStore,
        ApolloDepositStore _apolloDepositStore,
        ValidatorProxy _validatorProxy,
        KycWhitelist _kycWhitelist,
        Config _config,
        RolesEventEmitter _rolesEventEmitter,
        NodeAddressesStore _nodeAddressesStore
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
        nodeAddressesStore = _nodeAddressesStore;
    }

    function() public payable {}

    function onboardAsAtlas(string nodeUrl) public payable {
        require(canOnboard(msg.sender, Consts.NodeType.ATLAS, msg.value));

        atlasStakeStore.depositStake.value(msg.value)(msg.sender);
        rolesStore.setRole(msg.sender, Consts.NodeType.ATLAS);
        rolesStore.setUrl(msg.sender, nodeUrl);

        rolesEventEmitter.nodeOnboarded(msg.sender, msg.value, nodeUrl, Consts.NodeType.ATLAS);
    }

    function onboardAsAtlasSafe(address nodeAddress, string nodeUrl) public payable {
        require(canOnboard(nodeAddress, Consts.NodeType.ATLAS, msg.value));

        nodeAddressesStore.addNode(msg.sender, nodeAddress);
        atlasStakeStore.depositStake.value(msg.value)(msg.sender);
        rolesStore.setRole(nodeAddress, Consts.NodeType.ATLAS);
        rolesStore.setUrl(nodeAddress, nodeUrl);

        rolesEventEmitter.nodeOnboarded(nodeAddress, msg.value, nodeUrl, Consts.NodeType.ATLAS);
    }

    function onboardAsApollo() public payable {
        require(canOnboard(msg.sender, Consts.NodeType.APOLLO, msg.value));

        apolloDepositStore.storeDeposit.value(msg.value)(msg.sender);
        rolesStore.setRole(msg.sender, Consts.NodeType.APOLLO);
        validatorProxy.addValidator(msg.sender, msg.value);

        rolesEventEmitter.nodeOnboarded(msg.sender, msg.value, "", Consts.NodeType.APOLLO);
    }

    function onboardAsApolloSafe(address nodeAddress) public payable {
        require(canOnboard(nodeAddress, Consts.NodeType.APOLLO, msg.value));

        nodeAddressesStore.addNode(msg.sender, nodeAddress);
        apolloDepositStore.storeDeposit.value(msg.value)(msg.sender);
        rolesStore.setRole(nodeAddress, Consts.NodeType.APOLLO);
        validatorProxy.addValidator(nodeAddress, msg.value);

        rolesEventEmitter.nodeOnboarded(nodeAddress, msg.value, "", Consts.NodeType.APOLLO);
    }

    function onboardAsHermes(string nodeUrl) public {
        require(canOnboard(msg.sender, Consts.NodeType.HERMES, 0));

        rolesStore.setRole(msg.sender, Consts.NodeType.HERMES);
        rolesStore.setUrl(msg.sender, nodeUrl);

        rolesEventEmitter.nodeOnboarded(msg.sender, 0, nodeUrl, Consts.NodeType.HERMES);
    }

    function retireAtlas() public {
        address nodeAddress = getOperatingAddress(msg.sender);
        retire(nodeAddress, Consts.NodeType.ATLAS);

        uint amountToTransfer = atlasStakeStore.releaseStake(msg.sender, this);
        nodeAddressesStore.removeNode(msg.sender);

        rolesEventEmitter.nodeRetired(nodeAddress, amountToTransfer, Consts.NodeType.ATLAS);

        msg.sender.transfer(amountToTransfer);
    }

    function retireAtlasFullProcedure() public {
        address nodeAddress = getOperatingAddress(msg.sender);

        uint amountToTransfer = atlasStakeStore.releaseStake(msg.sender, this);
        nodeAddressesStore.removeNode(msg.sender);

        rolesEventEmitter.nodeRetired(nodeAddress, amountToTransfer, Consts.NodeType.ATLAS);

        msg.sender.transfer(amountToTransfer);
    }

    function quickRetireAtlas() public {
        address nodeAddress = getOperatingAddress(msg.sender);
        retire(nodeAddress, Consts.NodeType.ATLAS);
    }

    function retireApollo() public {
        address nodeAddress = getOperatingAddress(msg.sender);
        retire(nodeAddress, Consts.NodeType.APOLLO);

        uint amountToTransfer = apolloDepositStore.releaseDeposit(msg.sender, this);
        validatorProxy.removeValidator(nodeAddress);
        nodeAddressesStore.removeNode(msg.sender);

        rolesEventEmitter.nodeRetired(nodeAddress, amountToTransfer, Consts.NodeType.APOLLO);

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
        address nodeAddress = getOperatingAddress(msg.sender);
        string memory oldUrl = getUrl(nodeAddress);
        rolesStore.setUrl(nodeAddress, nodeUrl);
        string memory newUrl = getUrl(nodeAddress);
        rolesEventEmitter.nodeUrlChanged(nodeAddress, oldUrl, newUrl);
    }

    function canOnboard(address node, Consts.NodeType role, uint amount) public view returns (bool) {
        if (role == Consts.NodeType.APOLLO) {
            return kycWhitelist.hasRoleAssigned(node, role) && amount >= kycWhitelist.getRequiredDeposit(node);
        }
        return kycWhitelist.hasRoleAssigned(node, role) && amount == kycWhitelist.getRequiredDeposit(node);
    }

    function retireApollo(address apollo) public onlyOwner {
        require(rolesStore.getRole(apollo) == Consts.NodeType.APOLLO);
        rolesStore.setRole(apollo, Consts.NodeType.NONE);

        address staking = getStakingAddress(apollo);
        uint amountToTransfer = apolloDepositStore.releaseDeposit(staking, this);
        validatorProxy.removeValidator(apollo);
        nodeAddressesStore.removeNode(apollo);

        rolesEventEmitter.nodeRetired(apollo, amountToTransfer, Consts.NodeType.APOLLO);

        staking.transfer(amountToTransfer);
    }

    function retire(address node, Consts.NodeType role) private {
        require(rolesStore.getRole(node) == role);

        if (role == Consts.NodeType.ATLAS || role == Consts.NodeType.HERMES) {
            rolesStore.setUrl(node, "");
        }
        rolesStore.setRole(node, Consts.NodeType.NONE);
    }

    function getStakingAddress(address nodeAddress) private view returns (address) {
        address staking = nodeAddressesStore.staking(nodeAddress);
        return (address(0) == staking) ? nodeAddress : staking;
    }

    function getOperatingAddress(address nodeAddress) private view returns (address) {
        address operating = nodeAddressesStore.operating(nodeAddress);
        return (address(0) == operating) ? nodeAddress : operating;
    }
}
