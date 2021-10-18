pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./PoolsNodesManager.sol";
import "./PoolToken.sol";


contract Pool is Ownable {

    using SafeMath for uint;

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
    string public name;
    uint public id;

    function() public payable {}

    modifier onlyService() {
        require(address(msg.sender) == _service, "The message sender is not service");
        _;
    }

    // todo use Ownable constructor?
    constructor(string memory poolName, Consts.NodeType poolNodeType, uint poolNodeStake, uint poolMinStakeValue, uint poolFee, PoolsNodesManager manager, address service) public {
        require(poolMinStakeValue > 0, "Pool min stake value is zero");
        require(address(manager) != address(0), "Manager can not be zero");

        _manager = manager;
        _service = service;
        token = new PoolToken();
        nodeType = poolNodeType;
        nodeStake = poolNodeStake;
        minStakeValue = poolMinStakeValue;
        fee = poolFee;
        name = poolName;
        id = manager.nextId();
    }

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
            _removeNode();
        }
        active = false;
        msg.sender.transfer(address(this).balance);
    }

    function setService(address service) public onlyOwner {
        require(service != address(0x0), "Service must not be 0x0");
        _service = service;
    }

    function setName(string memory newName) public onlyOwner {
        name = newName;
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
        _manager.poolStakeChanged(msg.sender, int(msg.value), int(tokens));
        _onboardNodes();
    }

    function unstake(uint tokens) public {
        require(tokens <= token.balanceOf(msg.sender), "Sender has not enough tokens");
        uint tokenPrice = getTokenPrice();
        uint deposit = tokenPrice.mul(tokens).div(FIXEDPOINT);
        require(deposit <= totalStake, "Total stake is less than deposit");

        token.burn(msg.sender, tokens);
        while (address(this).balance < deposit) {
            _removeNode();
        }
        totalStake = totalStake.sub(deposit);
        ownerStake = nodeStake - (totalStake % nodeStake);
        msg.sender.transfer(deposit);
        _manager.poolStakeChanged(msg.sender, -int(deposit), -int(tokens));
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
            _manager.addNodeRequest(nodeStake, nodeType);
        }
    }

    function addReward() public payable {
        uint reward;
        if (nodes.length > 0) {
            reward = msg.value;
            if (nodes[0] == msg.sender) {
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
                _manager.poolReward(reward);
            }
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

    function _removeNode() private {
        _manager.retire(nodes[nodes.length-1], nodeType);
        delete nodes[nodes.length-1];
        nodes.length--;
    }

    function getNodesCount() public view returns(uint) {
        return nodes.length;
    }

    function getNodes(uint from, uint to) public view returns (address[] _nodes) {
        require(from >= 0 && from < nodes.length, "From index out of bounds");
        require(to > from && to <= nodes.length, "To index out of bounds");
        uint i;
        _nodes = new address[](to - from);
        for (i = from; i < to; i++) {
            _nodes[i - from] = nodes[i];
        }
    }
}
