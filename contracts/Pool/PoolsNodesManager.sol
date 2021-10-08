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
import "../Storage/PoolsStore.sol";
import "../Storage/PoolEventsEmitter.sol";


contract PoolsNodesManager is Base, Ownable {

    PoolsStore private poolsStore;
    Config private config;
    KycWhitelistStore private kycWhitelistStore;
    ValidatorProxy private validatorProxy;
    AtlasStakeStore private atlasStakeStore;
    RolesStore private rolesStore;
    ApolloDepositStore private apolloDepositStore;
    RolesEventEmitter private rolesEventEmitter;
    PoolEventsEmitter private poolEventsEmitter;

    modifier onlyPoolsCalls() {
        require(poolsStore.isPool(address(msg.sender)), "The message sender is not pool");
        _;
    }

    constructor(
        Head _head,
        PoolsStore _poolsStore,
        Config _config,
        KycWhitelistStore _kycWhitelistStore,
        ValidatorProxy _validatorProxy,
        AtlasStakeStore _atlasStakeStore,
        RolesStore _rolesStore,
        ApolloDepositStore _apolloDepositStore,
        RolesEventEmitter _rolesEventEmitter,
        PoolEventsEmitter _poolEventsEmitter
    ) public Base(_head) {
        poolsStore = _poolsStore;
        config = _config;
        kycWhitelistStore = _kycWhitelistStore;
        validatorProxy = _validatorProxy;
        atlasStakeStore = _atlasStakeStore;
        rolesStore = _rolesStore;
        apolloDepositStore = _apolloDepositStore;
        rolesEventEmitter = _rolesEventEmitter;
        poolEventsEmitter = _poolEventsEmitter;
    }

    function() public payable {}

    function onboard(address nodeAddress, Consts.NodeType nodeType) external payable onlyPoolsCalls {
        if (nodeType == Consts.NodeType.APOLLO) {
            require(msg.value >= config.APOLLO_DEPOSIT(), "Invalid deposit value");
            kycWhitelistStore.set(nodeAddress, Consts.NodeType.APOLLO, msg.value);
            apolloDepositStore.storeDeposit.value(msg.value)(nodeAddress);
            rolesStore.setRole(nodeAddress, Consts.NodeType.APOLLO);
            validatorProxy.addValidator(nodeAddress, msg.value);
            rolesEventEmitter.nodeOnboarded(nodeAddress, msg.value, "", Consts.NodeType.APOLLO);
            return;
        }
        revert("Unsupported node type");
    }

    function retire(address nodeAddress, Consts.NodeType nodeType) external onlyPoolsCalls returns (uint) {
        if (nodeType == Consts.NodeType.APOLLO) {
            uint amountToTransfer = apolloDepositStore.releaseDeposit(nodeAddress, this);
            validatorProxy.removeValidator(nodeAddress);
            rolesEventEmitter.nodeRetired(nodeAddress, amountToTransfer, Consts.NodeType.APOLLO);
            msg.sender.transfer(amountToTransfer);
            return amountToTransfer;
        }
        revert("Unsupported node type");
    }

    function addPool(address pool) public onlyOwner {
        poolsStore.addPool(pool);
    }

    function removePool(address pool) public onlyOwner {
        poolsStore.removePool(pool);
    }

    function poolStakeChanged(address user, int stake, int tokens) public onlyPoolsCalls {
        poolEventsEmitter.poolStakeChanged(msg.sender, user, stake, tokens);
    }

    function poolReward(uint reward) public onlyPoolsCalls {
        poolEventsEmitter.poolReward(msg.sender, reward);
    }

    function addNodeRequest(uint stake, Consts.NodeType role) public onlyPoolsCalls {
        poolEventsEmitter.addNodeRequest(msg.sender, stake, role);
    }
}
