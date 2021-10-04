/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Configuration/Consts.sol";
import "../Storage/PoolsStore.sol";
import "../Pool/PoolsNodesManager.sol";

contract PoolTest {
    function() public payable {}
/*
    function testOnboardRetire(address manager, Consts.NodeType nodeType) public payable {
        PoolsNodesManager pm = PoolsNodesManager(manager);
        require(nodeType == Consts.NodeType.APOLLO, "nodeType != APOLLO");
        address node1 = pm.onboard.value(msg.value)(nodeType);
        require(node1 != address(0), "onboard returned address(0)");
        uint amountToTransfer = pm.retire(node1);
        require(amountToTransfer == msg.value, "returned amount != msg.value");

        // repeat with uncloked node availiable
        address node2 = pm.onboard.value(msg.value)(nodeType);
        require(node2 == node1, "onboard did not return the same node");
        amountToTransfer = pm.retire(node2);
        require(amountToTransfer == msg.value, "returned amount != msg.value");

        msg.sender.transfer(amountToTransfer);
    }
*/
}