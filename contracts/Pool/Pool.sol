pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./PoolsNodesManager.sol";
import "./PoolToken.sol";


contract Pool is Ownable {

    using SafeMath for uint;

    event PoolStakeChanged(address pool, address user, int stake, int tokens);
    event PoolReward(address pool, uint reward);
    event AddNodeRequest(address pool, uint stake, Consts.NodeType role);

    uint constant private MILLION = 1000000;
    uint constant private FIXEDPOINT = 1 ether;

    PoolsNodesManager private _manager;
    address private _service;
    PoolToken public token;
    uint public totalStake;
    Consts.NodeType public nodeType;
    uint public nodeStake;
    uint public minStakeValue;
    address[] public nodes;
    uint public fee;
    bool public active;
    uint public ownerStake;
    uint[] public requests;

    modifier onlyService() {
        require(address(msg.sender) == _service, "The message sender is not service");
        _;
    }

    // todo use Ownable constructor?
    constructor(Consts.NodeType poolNodeType, uint poolNodeStake, uint poolMinStakeValue, uint poolFee, PoolsNodesManager manager, address service) public {
        require(poolMinStakeValue > 0, "Pool min stake value is zero");
        require(address(manager) != address(0), "Manager can not be zero");

        _manager = manager;
        _service = service;
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
            _manager.retire(nodes[nodes.length-1], nodeType);
            delete nodes[nodes.length-1];
            nodes.length--;
        }
        active = false;
        msg.sender.transfer(address(this).balance);
    }

    function setService(address service) public onlyOwner {
        require(service != address(0x0), "Service must not be 0x0");
        _service = service;
    }

    function stake() public payable {
        require(active, "Pool is not active");
        require(msg.value >= minStakeValue, "Pool: stake value tool low");
        uint tokenPrice = getTokenPrice();
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
        uint tokenPrice = getTokenPrice();
        uint deposit = tokenPrice.mul(tokens).div(FIXEDPOINT);
        require(deposit <= totalStake);

        token.burn(msg.sender, tokens);
        while (address(this).balance < deposit) {
            _manager.retire(nodes[nodes.length-1], nodeType);
            delete nodes[nodes.length-1];
            nodes.length--;
        }
        totalStake = totalStake.sub(deposit);
        ownerStake = nodeStake - (totalStake % nodeStake);
        msg.sender.transfer(deposit);
        emit PoolStakeChanged(address(this), msg.sender, -int(deposit), -int(tokens));
    }

    function viewStake() public view returns (uint) {
        return token.balanceOf(msg.sender);
    }

    function getTotalStake() public view returns (uint) {
        return totalStake;
    }

    function getTokenPrice() public view returns (uint) {
        uint total = token.totalSupply();
        if (total > 0) {
            return getTotalStake().mul(FIXEDPOINT).div(total);
        }
        return 1 ether;
    }

    function _onboardNodes() private {
        uint requested;
        for (uint idx = 0; idx < requests.length; idx++) {
            requested = requested.add(requests[idx]);
        }
        while (address(this).balance.sub(requested) >= nodeStake) {
            requested = requested.add(nodeStake);
            requests.push(nodeStake);
            emit AddNodeRequest(address(this), nodeStake, nodeType);
        }
    }

    function addReward() public payable {
        uint reward = msg.value;
        if (nodes.length > 0 && nodes[nodes.length - 1] == msg.sender) {
            if (ownerStake < nodeStake) {
                reward = reward.sub(reward.mul(ownerStake).div(nodeStake));
            } else {
                reward = 0;
            }
        }
        if (reward > 0) {
            if (fee > 0) {
                reward = reward.sub(reward.mul(fee).div(MILLION));
            }
            totalStake = totalStake.add(reward);
            emit PoolReward(address(this), reward);
        }
        owner.transfer(msg.value.sub(reward));
        _onboardNodes();
    }

    function addNode(address node) public onlyService {
        require(node != address(0), "Node can not be zero");
        require(requests.length > 0, "No active requests");
        requests.length -= 1;
        _manager.onboard.value(nodeStake)(node, nodeType);
        nodes.push(node);
    }
}
