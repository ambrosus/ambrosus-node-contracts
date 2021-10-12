/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Configuration/Consts.sol";
import "../Boilerplate/Head.sol";


contract PoolEventsEmitter is Base {

    constructor(Head _head) Base(_head) public {}

    event PoolStakeChanged(address pool, address user, int stake, int tokens);
    event PoolReward(address pool, uint reward);
    event AddNodeRequest(address pool, uint stake, Consts.NodeType role);

    function poolStakeChanged(address pool, address user, int stake, int tokens) public onlyContextInternalCalls {
        emit PoolStakeChanged(pool, user, stake, tokens);
    }

    function poolReward(address pool, uint reward) public onlyContextInternalCalls {
        emit PoolReward(pool, reward);
    }

    function addNodeRequest(address pool, uint stake, Consts.NodeType role) public onlyContextInternalCalls {
        emit AddNodeRequest(pool, stake, role);
    }
}
