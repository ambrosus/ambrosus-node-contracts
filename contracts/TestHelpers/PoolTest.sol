/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Configuration/Consts.sol";
import "../Storage/PoolsNodesStorage.sol";
import "../Pool/PoolsNodesManager.sol";

contract PoolTest {
    function() public payable {}

    function testLockUnlockNode(address stor, address node) public {
        PoolsNodesStorage st = PoolsNodesStorage(stor);
        address lockedNode = st.lockNode(address(this), Consts.NodeType.ATLAS);
        require(lockedNode == address(0), "lockNode should return address(0) when no unlocked nodes availiable");

        st.addNode(node, address(0), Consts.NodeType.ATLAS);

        lockedNode = st.lockNode(address(this), Consts.NodeType.ATLAS);
        require(lockedNode != address(0), "lockNode should return locked node address when unlocked nodes availiable");

        st.unlockNode(lockedNode);
        st.unlockNode(lockedNode); // unlock unlocked node should work
    }

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

    function testRetire(address node, address manager) public {
        uint amountToTransfer = PoolsNodesManager(manager).retire(node);
        require(amountToTransfer == 0, "returned amount != 0");
    }
}