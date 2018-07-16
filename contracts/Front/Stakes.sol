/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "../Configuration/Roles.sol";
import "../Storage/StakeStore.sol";
import "../Storage/KycWhitelist.sol";


contract Stakes is Base {

    constructor(Head _head) public Base(_head) { }

    function depositStake(Roles.NodeType role) public payable {
        require(role == Roles.NodeType.ATLAS || role == Roles.NodeType.HERMES || role == Roles.NodeType.APOLLO);        
        
        KycWhitelist whitelist = context().kycWhitelist();
        require(whitelist.isWhitelisted(msg.sender));

        Roles roles = context().roles();
        require(roles.canStake(role, msg.value));

        StakeStore stakeStore = context().stakeStore();
        uint storageLimit = roles.getStorageLimit(role, msg.value);
        stakeStore.depositStake.value(msg.value)(msg.sender, storageLimit, role);
    }

    function releaseStake() public {
        StakeStore stakeStore = context().stakeStore();
        stakeStore.releaseStake(msg.sender);
    }

    function getStake(address staker) public view returns (uint) {
        StakeStore stakeStore = context().stakeStore();
        return stakeStore.getStake(staker);
    }
}
