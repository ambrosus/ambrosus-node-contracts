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
    event PoolReward(address pool, uint reward, uint tokenPrice);
    event AddNodeRequest(address pool, uint id, uint nodeId, uint stake, Consts.NodeType role);
    event AddNodeRequestResolved(address pool, uint id, uint status);

    function poolStakeChanged(address pool, address user, int stake, int tokens) public onlyContextInternalCalls {
        emit PoolStakeChanged(pool, user, stake, tokens);
    }

    function poolReward(address pool, uint reward, uint tokenPrice) public onlyContextInternalCalls {
        emit PoolReward(pool, reward, tokenPrice);
    }

    function addNodeRequest(address pool, uint id, uint nodeId, uint stake, Consts.NodeType role) public onlyContextInternalCalls {
        emit AddNodeRequest(pool, id, nodeId, stake, role);
    }

    function addNodeRequestResolved(address pool, uint id, uint status) public onlyContextInternalCalls {
        emit AddNodeRequestResolved(pool, id, status);
    }
}
