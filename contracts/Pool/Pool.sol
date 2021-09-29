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
    uint constant private FIXEDPOINT = 1 ether;

    PoolsNodesManager private _manager;
    PoolToken public token;
    uint public totalStake;
    Consts.NodeType public nodeType;
    uint public nodeStake;
    uint public minStakeValue;
    NodeInfo[] public nodes;
    uint public fee;
    bool public active;
    uint private ownerStake;

    // todo use Ownable constructor?
    constructor(Consts.NodeType poolNodeType, uint poolNodeStake, uint poolMinStakeValue, uint poolFee, PoolsNodesManager manager) public {
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

    function activate() public payable onlyOwner {
        require(!active, "Pool is already active");
        require(msg.value == nodeStake, "Send value not equals node stake value");
        active = true;
        ownerStake = msg.value;
        _onboardNodes();
    }

    function deactivate() public onlyOwner {
        require(active, "Pool is not active");
        require(totalStake <= minStakeValue.div(10), "Pool is not retired");
        while (nodes.length > 0) {
            _manager.retire(address(nodes[nodes.length-1].node));
            delete nodes[nodes.length-1];
            nodes.length--;
        }
        active = false;
        msg.sender.transfer(address(this).balance);
    }

    function stake() public payable {
        require(active, "Pool is not active");
        require(msg.value >= minStakeValue, "Pool: stake value tool low");
        uint tokenPrice = computePreciseTokenPrice();
        uint tokens = msg.value.mul(FIXEDPOINT).div(tokenPrice);

        // todo return (msg.value % tokenPrice) to user ?
        token.mint(msg.sender, tokens);
        totalStake = totalStake.add(msg.value);
        ownerStake = nodeStake - (totalStake % nodeStake);
        emit PoolStakeChanged(address(this), msg.sender, int(msg.value), int(tokens));
        _onboardNodes();
    }

    function unstake(uint tokens) public {
        require(tokens <= token.balanceOf(msg.sender));
        uint tokenPrice = computePreciseTokenPrice();
        uint deposit = tokenPrice.mul(tokens).div(FIXEDPOINT);
        require(deposit <= totalStake);

        token.burn(msg.sender, tokens);
        while (address(this).balance < deposit) {
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
        if (nodes.length > 0) {
            for (uint idx = 0; idx < nodes.length - 1; idx++) {
                reward = reward.add(address(nodes[idx].node).balance);
            }
            uint lastReward = address(nodes[nodes.length - 1].node).balance;
            uint ownerPart = lastReward;
            if (ownerStake < nodeStake) {
                ownerPart = ownerPart.mul(ownerStake).div(nodeStake);
            }
            reward = reward.add(lastReward).sub(ownerPart);
            if (fee > 0) {
                reward = reward.sub(reward.mul(fee).div(MILLION));
            }
        }
        return totalStake.add(reward);
    }

    function getTokenPrice() public view returns (uint) {
        return computeEstimateTokenPrice();
    }

    function computeEstimateTokenPrice() private view returns (uint) {
        uint total = token.totalSupply();
        if (total > 0) {
            return getTotalStake().mul(FIXEDPOINT).div(total);
        }
        return 1 ether;
    }

    function computePreciseTokenPrice() private returns (uint) {
        uint reward;
        if (nodes.length > 0) {
            for (uint idx = 0; idx < nodes.length - 1; idx++) {
                reward = reward.add(nodes[idx].node.withdraw());
            }
            uint lastReward = nodes[nodes.length - 1].node.withdraw();
            uint ownerPart = lastReward;
            if (ownerStake < nodeStake) {
                ownerPart = ownerPart.mul(ownerStake).div(nodeStake);
                owner.transfer(ownerPart);
            }
            reward = reward.add(lastReward).sub(ownerPart);
            if (reward > 0) {
                if (totalStake > 0) {
                    if (fee > 0) {
                        uint ownerFee = reward.mul(fee).div(MILLION);
                        reward = reward.sub(ownerFee);
                        owner.transfer(ownerFee);
                    }
                    totalStake = totalStake.add(reward);
                    emit PoolReward(address(this), reward);
                } else {
                    owner.transfer(reward);
                }
            }
        }
        if (totalStake > 0) {
            return totalStake.mul(FIXEDPOINT).div(token.totalSupply());
        }
        return 1 ether;
    }

    function _onboardNodes() private {
        while (address(this).balance >= nodeStake) {
            address node = _manager.onboard.value(nodeStake)(nodeType);
            require(node != address(0), "Node deploy error");
            _addNode(PoolNode(node), nodeStake);
        }
    }

    function _addNode(PoolNode node, uint aStake) private {
        NodeInfo memory info;
        info.node = node;
        info.stake = aStake;
        nodes.push(info);
    }
}
