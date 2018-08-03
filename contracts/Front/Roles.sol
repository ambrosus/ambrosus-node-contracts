/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "../Configuration/Config.sol";
import "../Storage/AtlasStakeStore.sol";
import "../Storage/KycWhitelist.sol";
import "../Storage/RolesStore.sol";
import "../Storage/ApolloDepositStore.sol";


contract Roles is Base {

    constructor(Head _head) public Base(_head) { }

    function() public payable {}

    function onboardAsAtlas(string nodeUrl) public payable {
        require(canOnboardAsAtlas(msg.sender, msg.value));

        AtlasStakeStore atlasStakeStore = context().atlasStakeStore();
        uint storageLimit = getStorageLimitForAtlas(msg.value);
        atlasStakeStore.depositStake.value(msg.value)(msg.sender, storageLimit);

        RolesStore rolesStore = context().rolesStore();
        rolesStore.setRole(msg.sender, Config.NodeType.ATLAS);
        rolesStore.setUrl(msg.sender, nodeUrl);
    }

    function onboardAsApollo() public payable {
        require(canOnboardAsApollo(msg.sender, msg.value));

        ApolloDepositStore apolloDepositStore = context().apolloDepositStore();
        apolloDepositStore.storeDeposit.value(msg.value)(msg.sender);

        RolesStore rolesStore = context().rolesStore();
        rolesStore.setRole(msg.sender, Config.NodeType.APOLLO);
    }

    function onboardAsHermes(string nodeUrl) public {
        require(canOnboardAsHermes(msg.sender));

        RolesStore rolesStore = context().rolesStore();
        rolesStore.setRole(msg.sender, Config.NodeType.HERMES);
        rolesStore.setUrl(msg.sender, nodeUrl);
    }

    function retireAtlas() public {
        retire(msg.sender, Config.NodeType.ATLAS);

        AtlasStakeStore atlasStakeStore = context().atlasStakeStore();
        uint amountToTransfer = atlasStakeStore.releaseStake(msg.sender, this);
        msg.sender.transfer(amountToTransfer);
    }

    function retireApollo() public {
        retire(msg.sender, Config.NodeType.APOLLO);

        ApolloDepositStore apolloDepositStore = context().apolloDepositStore();
        uint amountToTransfer = apolloDepositStore.releaseDeposit(msg.sender, this);
        msg.sender.transfer(amountToTransfer);
    }

    function retireHermes() public {
        retire(msg.sender, Config.NodeType.HERMES);
    }

    function getOnboardedRole(address node) public view returns (Config.NodeType) {
        RolesStore rolesStore = context().rolesStore();
        return rolesStore.getRole(node);
    }

    function getUrl(address node) public view returns (string) {
        RolesStore rolesStore = context().rolesStore();
        return rolesStore.getUrl(node);
    }

    function canOnboardAsAtlas(address node, uint amount) public view returns (bool) {
        KycWhitelist kycWhitelist = context().kycWhitelist();

        return kycWhitelist.hasRoleAssigned(node, Config.NodeType.ATLAS) && validStakeAmountForAtlas(amount);
    }

    function canOnboardAsApollo(address node, uint amount) public view returns (bool) {
        KycWhitelist kycWhitelist = context().kycWhitelist();
        Config config = context().config();

        return kycWhitelist.hasRoleAssigned(node, Config.NodeType.APOLLO) && amount == config.APOLLO_DEPOSIT();
    }

    function canOnboardAsHermes(address node) public view returns (bool) {
        KycWhitelist kycWhitelist = context().kycWhitelist();
        return kycWhitelist.hasRoleAssigned(node, Config.NodeType.HERMES);
    }

    function getStorageLimitForAtlas(uint amount) public view returns (uint) {
        Config config = context().config();
        if (amount == config.ATLAS3_STAKE()) {
            return config.ATLAS3_STORAGE_LIMIT();
        } else if (amount == config.ATLAS2_STAKE()) {
            return config.ATLAS2_STORAGE_LIMIT();
        } else if (amount == config.ATLAS1_STAKE()) {
            return config.ATLAS1_STORAGE_LIMIT();
        }
        return 0;
    }

    function retire(address node, Config.NodeType role) private {
        RolesStore rolesStore = context().rolesStore();
        require(rolesStore.getRole(node) == role);
        rolesStore.setRole(node, Config.NodeType.NONE);
    }

    function validStakeAmountForAtlas(uint amount) view private returns(bool) {
        Config config = context().config();
        return amount == config.ATLAS1_STAKE() || amount == config.ATLAS2_STAKE() || amount == config.ATLAS3_STAKE();
    }
}
