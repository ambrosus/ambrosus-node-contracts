/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "./Config.sol";


contract Roles is Base {

    constructor(Head _head) public Base(_head) { }

    function canStake(Config.NodeType role, uint amount) public view returns (bool) {
        Config config = context().config();
        if (role == Config.NodeType.ATLAS) {
            return amount == config.ATLAS1_STAKE() || amount == config.ATLAS2_STAKE() || amount == config.ATLAS3_STAKE();
        } else if (role == Config.NodeType.HERMES) {
            return amount == config.HERMES_STAKE();
        } else if (role == Config.NodeType.APOLLO) {
            return amount == config.APOLLO_STAKE();
        }
        return false;
    }

    function getStorageLimit(Config.NodeType role, uint amount) public view returns (uint) {
        Config config = context().config();
        if (role == Config.NodeType.ATLAS) {
            if (amount >= config.ATLAS3_STAKE()) {
                return config.ATLAS3_STORAGE_LIMIT();
            } else if (amount >= config.ATLAS2_STAKE()) {
                return config.ATLAS2_STORAGE_LIMIT();
            } else if (amount >= config.ATLAS1_STAKE()) {
                return config.ATLAS1_STORAGE_LIMIT();
            } else {
                return 0;
            }
        }
        return 0;
    }
}
