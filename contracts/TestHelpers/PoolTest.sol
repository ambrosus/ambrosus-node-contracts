/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Configuration/Consts.sol";
import "../Storage/PoolsNodesStorage.sol";

contract PoolTest {
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
}