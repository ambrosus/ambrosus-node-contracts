pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../Configuration/Config.sol";
import "../Configuration/Consts.sol";
import "../Boilerplate/Head.sol";
import "../Storage/KycWhitelistStore.sol";
import "../Middleware/ValidatorProxy.sol";
import "../Storage/AtlasStakeStore.sol";
import "../Storage/RolesStore.sol";
import "../Storage/ApolloDepositStore.sol";
import "../Storage/RolesEventEmitter.sol";

import "./IPoolsNodesManager.sol";
import "./PoolNode.sol";


contract PoolsNodesManager is Ownable, IPoolsNodesManager {

    event PoolNodeOnboarded(address poolAddress, address nodeAddress, uint placedDeposit, string nodeUrl, Consts.NodeType role);
    event PoolNodeRetired(address poolAddress, address nodeAddress, uint releasedDeposit, Consts.NodeType role);

    struct NodeInfo {
        PoolNode node;
        address pool;
        Consts.NodeType nodeType;
    }

    mapping(address => bool) pools;
    NodeInfo[] private nodes;
    Config private config;
    KycWhitelistStore private kycWhitelistStore;
    ValidatorProxy private validatorProxy;
    AtlasStakeStore private atlasStakeStore;
    RolesStore private rolesStore;
    ApolloDepositStore private apolloDepositStore;
    RolesEventEmitter private rolesEventEmitter;

    modifier onlyPoolsCalls() {
        require(pools[address(msg.sender)], "The message sender is not pool");
        _;
    }

    constructor(
        Config _config,
        KycWhitelistStore _kycWhitelistStore,
        ValidatorProxy _validatorProxy,
        AtlasStakeStore _atlasStakeStore,
        RolesStore _rolesStore,
        ApolloDepositStore _apolloDepositStore,
        RolesEventEmitter _rolesEventEmitter
    ) public {
        config = _config;
        kycWhitelistStore = _kycWhitelistStore;
        validatorProxy = _validatorProxy;
        atlasStakeStore = _atlasStakeStore;
        rolesStore = _rolesStore;
        apolloDepositStore = _apolloDepositStore;
        rolesEventEmitter = _rolesEventEmitter;
    }

    function onboard(Consts.NodeType nodeType) external payable onlyPoolsCalls returns (address) {
        PoolNode node;
        for (uint idx = 0; idx < nodes.length; idx++) {
            if (nodes[idx].pool == address(0)) {
                node = nodes[idx].node;
                nodes[idx].pool = msg.sender;
                nodes[idx].nodeType = nodeType;
                break;
            }
        }
        if (address(node) == address(0)) {
            node = new PoolNode(this);
            NodeInfo memory info;
            info.node = node;
            info.pool = msg.sender;
            info.nodeType = nodeType;
            nodes.push(info);
        }
        node.setPool(msg.sender);
        if (nodeType == Consts.NodeType.APOLLO) {
            require(msg.value >= config.APOLLO_DEPOSIT(), "Invalid deposit value");
            kycWhitelistStore.set(address(node), Consts.NodeType.APOLLO, msg.value);
            apolloDepositStore.storeDeposit.value(msg.value)(address(node));
            rolesStore.setRole(address(node), Consts.NodeType.APOLLO);
            validatorProxy.addValidator(address(node), msg.value);
            rolesEventEmitter.nodeOnboarded(address(node), msg.value, "", Consts.NodeType.APOLLO);
            emit PoolNodeOnboarded(msg.sender, address(node), msg.value, "", Consts.NodeType.APOLLO);
        }
        return node;
    }

    function retire(address nodeAddress) external onlyPoolsCalls returns (uint) {
        for (uint idx = 0; idx < nodes.length; idx++) {
            if (address(nodes[idx].node) == nodeAddress && nodes[idx].pool == msg.sender) {
                nodes[idx].pool = address(0);
                nodes[idx].node.setPool(address(0));
                if (nodes[idx].nodeType == Consts.NodeType.APOLLO) {
                    uint amountToTransfer = apolloDepositStore.releaseDeposit(nodeAddress, this);
                    validatorProxy.removeValidator(nodeAddress);
                    rolesEventEmitter.nodeRetired(nodeAddress, amountToTransfer, Consts.NodeType.APOLLO);
                    emit PoolNodeRetired(msg.sender, nodeAddress, amountToTransfer, Consts.NodeType.APOLLO);
                    msg.sender.transfer(amountToTransfer);
                    return amountToTransfer;
                }
                break;
            }
        }
        revert("Node not registered");
    }

    function add(address pool) public onlyOwner {
        require(!pools[pool], "Pool already registered");
        pools[pool] = true;
    }

    function remove(address pool) public onlyOwner {
        require(pools[pool], "Pool not registered");
        delete pools[pool];
    }
}
