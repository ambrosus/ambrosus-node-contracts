pragma solidity ^0.4.23;

import "../Configuration/Consts.sol";
import "../Boilerplate/Head.sol";
import "../Pool/PoolNode.sol";


contract PoolsNodesStorage is Base {

    event PoolAdded(address poolAddress);
    event PoolRemoved(address poolAddress);

    event PoolNodeCreated(address nodeAddress);
    event PoolNodeOnboarded(address poolAddress, address nodeAddress, uint placedDeposit, string nodeUrl, Consts.NodeType role);
    event PoolNodeRetired(address poolAddress, address nodeAddress, uint releasedDeposit, Consts.NodeType role);

    struct NodeInfo {
        address pool;
        Consts.NodeType nodeType;
    }

    mapping(address => NodeInfo) private nodes;
    address[] private index;
    mapping(address => bool) pools;

    constructor(Head _head) public Base(_head) { }

    function addNode(address node, address pool, Consts.NodeType nodeType) public onlyContextInternalCalls {
        require(nodeType != Consts.NodeType.NONE, "Node type not set");
        require(getNodeType(node) == Consts.NodeType.NONE, "Node already exists");
        // TODO: Add owner check
        nodes[node] = NodeInfo(pool, nodeType);
        index.push(node);
        PoolNode(node).setPool(pool);
    }

    function lockNode(address pool, Consts.NodeType nodeType) public onlyContextInternalCalls returns (address) {
        require(nodeType != Consts.NodeType.NONE, "Node type not set");
        require(pool != address(0), "Node pool not set");

        for (uint idx = 0; idx < index.length; idx++) {
            address node = index[idx];
            if (nodes[node].pool == address(0)) {
                nodes[node].pool = pool;
                nodes[node].nodeType = nodeType;
                PoolNode(node).setPool(pool);
                return node;
            }
        }

        return address(0);
    }

    function unlockNode(address node) public onlyContextInternalCalls {
        require(getNodeType(node) != Consts.NodeType.NONE, "Node not exists");
        nodes[node].pool = address(0);
        PoolNode(node).setPool(address(0));
    }

    function getNodeType(address node) public view returns (Consts.NodeType) {
        return nodes[node].nodeType;
    }

    function addPool(address pool) public onlyContextInternalCalls {
        require(!pools[pool], "Pool already registered");
        require(pool != address(0), "Pool must not be 0x0");
        pools[pool] = true;
        emit PoolAdded(pool);
    }

    function removePool(address pool) public onlyContextInternalCalls {
        require(pools[pool], "Pool not registered");
        delete pools[pool];
        emit PoolRemoved(pool);
    }

    function isPool(address pool) public view returns (bool) {
        return pools[pool];
    }

    function poolNodeCreated(address nodeAddress) public {
        emit PoolNodeCreated(nodeAddress);
    }

    function poolNodeOnboarded(address poolAddress, address nodeAddress, uint placedDeposit, string memory nodeUrl, Consts.NodeType role) public {
        emit PoolNodeOnboarded(poolAddress, nodeAddress, placedDeposit, nodeUrl, role);
    }

    function poolNodeRetired(address poolAddress, address nodeAddress, uint releasedDeposit, Consts.NodeType role) public {
        emit PoolNodeRetired(poolAddress, nodeAddress, releasedDeposit, role);
    }
}
