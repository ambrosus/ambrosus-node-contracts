/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";


contract Roles is Base {

    uint constant UNIT = 10**18;

    uint constant APOLLO_STAKE = 250000 * UNIT;
    uint constant HERMES_STAKE = 150000 * UNIT;
    uint constant ATLAS1_STAKE = 10000 * UNIT;
    uint constant ATLAS2_STAKE = 30000 * UNIT;
    uint constant ATLAS3_STAKE = 75000 * UNIT;

    uint constant ATLAS1_STORAGE_LIMIT = 100000;
    uint constant ATLAS2_STORAGE_LIMIT = 400000;
    uint constant ATLAS3_STORAGE_LIMIT = 1000000;
  
    enum NodeType {ATLAS, HERMES, APOLLO}

    constructor(Head _head) public Base(_head) {        
    }

    function canStake(NodeType role, uint amount) public pure returns (bool) {
        if (role == NodeType.ATLAS) { 
            return amount >= ATLAS1_STAKE;
        } else if (role == NodeType.HERMES) {
            return amount >= HERMES_STAKE;
        } else if (role == NodeType.APOLLO) {
            return amount >= APOLLO_STAKE;
        }
        return false;
    }

    function getStorageLimit(NodeType role, uint amount) public pure returns (uint) {
        if (role == NodeType.ATLAS) { 
            if (amount >= ATLAS3_STAKE) {
                return ATLAS3_STORAGE_LIMIT;
            } else if (amount >= ATLAS2_STAKE) {
                return ATLAS2_STORAGE_LIMIT;
            } else if (amount >= ATLAS1_STAKE) {
                return ATLAS1_STORAGE_LIMIT;
            } else {
                return 0;
            }
        }
        return 0;
    }
}
