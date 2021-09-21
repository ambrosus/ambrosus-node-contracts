pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./PoolsNodesManager.sol";
import "./PoolNode.sol";
import "./PoolToken.sol";


contract Pool is Ownable {

    using SafeMath for uint;

    event PoolStakeChanged(address pool, address user, int stake);
    event PoolReward(address pool, uint reward);

    struct NodeInfo {
        PoolNode node;
        uint stake;
    }

    uint constant private MILLION = 1000000;

    PoolsNodesManager private _manager;
    PoolToken private _token;
    uint private _totalStake;
    Consts.NodeType public nodeType;
    uint public nodeStake;
    uint public minStakeValue;
    NodeInfo[] public _nodes;
    uint private _feePPM;

    // todo use Ownable constructor?
    constructor(Consts.NodeType poolNodeType, uint poolNodeStake, uint poolMinStakeValue, PoolsNodesManager manager) public payable {
        require(msg.value == poolNodeStake, "Send value not equals node stake value");
        require(poolMinStakeValue > 0, "Pool min stake value is zero");
        require(address(manager) != address(0), "Manager can not be zero");

        _manager = manager;
        _token = new PoolToken();
        nodeType = poolNodeType;
        nodeStake = poolNodeStake;
        minStakeValue = poolMinStakeValue;
    }

    // receive eth from node
    function() public payable {}

    function stake() public payable returns (uint) {
        require(msg.value >= minStakeValue, "Pool: stake value tool low");
        uint tokenPrice = computePreciseTokenPrice();
        uint tokens = msg.value.div(tokenPrice);

        // todo return (msg.value % tokenPrice) to user ?
        _token.mint(msg.sender, tokens);
        _totalStake = _totalStake.add(msg.value);
        emit PoolStakeChanged(address(this), msg.sender, int(msg.value));
        if (address(this).balance >= nodeStake) {  // todo ???
            address node = _manager.onboard.value(nodeStake)(nodeType);
            require(node != address(0), "Node deploy error");
            _addNode(PoolNode(node), nodeStake);
        }
        return tokens;
    }

    function unstake(uint tokens) public {
        require(tokens <= _token.balanceOf(msg.sender));
        uint tokenPrice = computePreciseTokenPrice();
        uint deposit = tokenPrice.mul(tokens);
        require(deposit <= _totalStake);

        _token.burn(msg.sender, tokens);
        while (address(this).balance < deposit) { // todo ???
            _manager.retire(address(_nodes[_nodes.length-1].node));
            delete _nodes[_nodes.length-1];
        }
        _totalStake = _totalStake.sub(deposit);
        msg.sender.transfer(deposit);
        emit PoolStakeChanged(address(this), msg.sender, -int(deposit));
    }

    function viewStake() public view returns (uint) {
        return _token.balanceOf(msg.sender);
    }

    function getFee() public view onlyOwner returns (uint) {
        return _feePPM;
    }

    function setFee(uint fee) public onlyOwner {
        require(fee >= 0 && fee <= MILLION);
        _feePPM = fee;
    }

    function getTotalStake() public view returns (uint) {
        uint reward;
        for (uint idx = 0; idx < _nodes.length; idx++) {
            reward = reward.add(address(_nodes[idx].node).balance);
        }
        if (_feePPM > 0) {
            reward = reward.sub(reward.mul(_feePPM).div(MILLION));
        }
        return _totalStake.add(reward);
    }

    function getTokenPrice() public view returns (uint) {
        return computeEstimateTokenPrice();
    }

    function computeEstimateTokenPrice() private view returns (uint) {
        return getTotalStake().div(_token.totalSupply());
    }

    // todo why compute..() makes transfer?
    function computePreciseTokenPrice() private returns (uint) {
        uint reward;
        for (uint idx = 0; idx < _nodes.length; idx++) {
            reward = reward.add(_nodes[idx].node.withdraw());
        }
        if (_feePPM > 0) {
            uint fee = reward.mul(_feePPM).div(MILLION);
            reward = reward.sub(fee);
            owner.transfer(fee);
        }
        _totalStake = _totalStake.add(reward);
        emit PoolReward(address(this), reward);
        if (_totalStake > 0) {
            return _totalStake.div(_token.totalSupply());
        }
        return 1 ether;
    }

    function _addNode(PoolNode node, uint aStake) private {
        NodeInfo memory info;
        info.node = node;
        info.stake = aStake;
        _nodes.push(info);
    }
}
