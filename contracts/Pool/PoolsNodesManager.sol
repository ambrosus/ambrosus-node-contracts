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
import "../Storage/PoolsNodesStorage.sol";

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
    PoolsNodesStorage private poolsNodesStorage;
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
        PoolsNodesStorage _poolsNodesStorage,
        Config _config,
        KycWhitelistStore _kycWhitelistStore,
        ValidatorProxy _validatorProxy,
        AtlasStakeStore _atlasStakeStore,
        RolesStore _rolesStore,
        ApolloDepositStore _apolloDepositStore,
        RolesEventEmitter _rolesEventEmitter
    ) public {
        poolsNodesStorage = _poolsNodesStorage;
        config = _config;
        kycWhitelistStore = _kycWhitelistStore;
        validatorProxy = _validatorProxy;
        atlasStakeStore = _atlasStakeStore;
        rolesStore = _rolesStore;
        apolloDepositStore = _apolloDepositStore;
        rolesEventEmitter = _rolesEventEmitter;
    }

    function onboard(Consts.NodeType nodeType) external payable onlyPoolsCalls returns (address) {
        PoolNode node = PoolNode(poolsNodesStorage.lockNode(msg.sender, nodeType));
        if (address(node) == address(0)) {
            node = new PoolNode(this);
            poolsNodesStorage.addNode(address(node), msg.sender, nodeType);
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
        poolsNodesStorage.unlockNode(nodeAddress);
        PoolNode(nodeAddress).setPool(address(0));
        Consts.NodeType nodeType = poolsNodesStorage.getNodeType(nodeAddress);
        if (nodeType == Consts.NodeType.APOLLO) {
            uint amountToTransfer = apolloDepositStore.releaseDeposit(nodeAddress, this);
            validatorProxy.removeValidator(nodeAddress);
            rolesEventEmitter.nodeRetired(nodeAddress, amountToTransfer, Consts.NodeType.APOLLO);
            emit PoolNodeRetired(msg.sender, nodeAddress, amountToTransfer, Consts.NodeType.APOLLO);
            msg.sender.transfer(amountToTransfer);
            return amountToTransfer;
        }
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
