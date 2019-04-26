/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../Boilerplate/Head.sol";
import "../Configuration/Consts.sol";
import "../Configuration/Config.sol";
import "../Storage/KycWhitelistStore.sol";


contract KycWhitelist is Ownable {

    KycWhitelistStore private kycWhitelistStore;
    Config private config;

    constructor(KycWhitelistStore _kycWhitelistStore, Config _config) public {
        kycWhitelistStore = _kycWhitelistStore;
        config = _config;
    }

    function add(address candidate, Consts.NodeType role, uint deposit) public onlyOwner {
        require(!isWhitelisted(candidate));
        require(role == Consts.NodeType.ATLAS || role == Consts.NodeType.HERMES || role == Consts.NodeType.APOLLO);
        requireCorrectDeposit(role, deposit);

        kycWhitelistStore.set(candidate, role, deposit);
    }

    function remove(address candidate) public onlyOwner {
        require(isWhitelisted(candidate));
        kycWhitelistStore.set(candidate, Consts.NodeType.NONE, 0);
    }

    function isWhitelisted(address candidate) public view returns(bool) {
        return kycWhitelistStore.getRoleAssigned(candidate) != Consts.NodeType.NONE;
    }

    function hasRoleAssigned(address candidate, Consts.NodeType role) public view returns(bool) {
        return kycWhitelistStore.getRoleAssigned(candidate) == role;
    }

    function getRequiredDeposit(address candidate) public view returns(uint) {
        return kycWhitelistStore.getRequiredDeposit(candidate);
    }

    function getRoleAssigned(address candidate) public view returns(Consts.NodeType role) {
        return kycWhitelistStore.getRoleAssigned(candidate);
    }

    function requireCorrectDeposit(Consts.NodeType role, uint deposit) private view {
        if (role == Consts.NodeType.APOLLO) {
            require(deposit >= config.APOLLO_DEPOSIT());
        } else if (role == Consts.NodeType.ATLAS) {
            require(deposit == config.ATLAS_STAKE(uint(Consts.SecondaryNodeType.ZETA)) || deposit == config.ATLAS_STAKE(uint(Consts.SecondaryNodeType.SIGMA)) || deposit == config.ATLAS_STAKE(uint(Consts.SecondaryNodeType.OMEGA)));
        }
    }
}
