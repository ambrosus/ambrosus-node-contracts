pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./PoolsNodesManager.sol";
import "./PoolNode.sol";
import "./PoolToken.sol";


contract Pool is Ownable {

    using SafeMath for uint;

    event PoolStakeChanged(address pool, address user, int stake, int tokens);
    event PoolReward(address pool, uint reward);

    struct NodeInfo {
        PoolNode node;
        uint stake;
    }

    uint constant private MILLION = 1000000;

    PoolsNodesManager private _manager;
    PoolToken public token;
    uint public totalStake;
    Consts.NodeType public nodeType;
    uint public nodeStake;
    uint public minStakeValue;
    NodeInfo[] public nodes;
    uint public fee;

    // todo use Ownable constructor?
    constructor(Consts.NodeType poolNodeType, uint poolNodeStake, uint poolMinStakeValue, uint poolFee, PoolsNodesManager manager) public payable {
        require(msg.value == poolNodeStake, "Send value not equals node stake value");
        require(poolMinStakeValue > 0, "Pool min stake value is zero");
        require(address(manager) != address(0), "Manager can not be zero");

        _manager = manager;
        token = new PoolToken();
        nodeType = poolNodeType;
        nodeStake = poolNodeStake;
        minStakeValue = poolMinStakeValue;
        fee = poolFee;
    }

    // receive eth from node
    function() public payable {}

    function stake() public payable {
        require(msg.value >= minStakeValue, "Pool: stake value tool low");
        uint tokenPrice = computePreciseTokenPrice();
        uint tokens = msg.value.div(tokenPrice);

        // todo return (msg.value % tokenPrice) to user ?
        token.mint(msg.sender, tokens);
        totalStake = totalStake.add(msg.value);
        emit PoolStakeChanged(address(this), msg.sender, int(msg.value), int(tokens));
        if (address(this).balance >= nodeStake) {  // todo ???
            address node = _manager.onboard.value(nodeStake)(nodeType);
            require(node != address(0), "Node deploy error");
            _addNode(PoolNode(node), nodeStake);
        }
    }

    function unstake(uint tokens) public {
        require(tokens <= token.balanceOf(msg.sender));
        uint tokenPrice = computePreciseTokenPrice();
        uint deposit = tokenPrice.mul(tokens);
        require(deposit <= totalStake);

        token.burn(msg.sender, tokens);
        while (address(this).balance < deposit) { // todo ???
            _manager.retire(address(nodes[nodes.length-1].node));
            delete nodes[nodes.length-1];
            nodes.length--;
        }
        totalStake = totalStake.sub(deposit);
        msg.sender.transfer(deposit);
        emit PoolStakeChanged(address(this), msg.sender, -int(deposit), -int(tokens));
    }

    function viewStake() public view returns (uint) {
        return token.balanceOf(msg.sender);
    }

    function getTotalStake() public view returns (uint) {
        uint reward;
        for (uint idx = 0; idx < nodes.length; idx++) {
            reward = reward.add(address(nodes[idx].node).balance);
        }
        if (fee > 0) {
            reward = reward.sub(reward.mul(fee).div(MILLION));
        }
        return totalStake.add(reward);
    }

    function getTokenPrice() public view returns (uint) {
        return computeEstimateTokenPrice();
    }

    function computeEstimateTokenPrice() private view returns (uint) {
        uint total = token.totalSupply();
        if (total > 0) {
            return getTotalStake().div(total);
        }
        return 1 ether;
    }

    // todo why compute..() makes transfer?
    function computePreciseTokenPrice() private returns (uint) {
        uint reward;
        for (uint idx = 0; idx < nodes.length; idx++) {
            reward = reward.add(nodes[idx].node.withdraw());
        }
        if (reward > 0) {
            if (fee > 0) {
                uint ownerFee = reward.mul(fee).div(MILLION);
                reward = reward.sub(ownerFee);
                owner.transfer(ownerFee);
            }
            totalStake = totalStake.add(reward);
            emit PoolReward(address(this), reward);
        }
        if (totalStake > 0) {
            return totalStake.div(token.totalSupply());
        }
        return 1 ether;
    }

    function _addNode(PoolNode node, uint aStake) private {
        NodeInfo memory info;
        info.node = node;
        info.stake = aStake;
        nodes.push(info);
    }
}
