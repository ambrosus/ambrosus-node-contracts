pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../Boilerplate/Head.sol";
import "../Boilerplate/Context.sol";
import "../Boilerplate/Catalogue.sol";
import "./PoolsNodesManager.sol";
import "./PoolToken.sol";


contract Pool is Ownable {

    using SafeMath for uint;

    uint constant private MILLION = 1000000;
    uint constant private FIXEDPOINT = 1 ether;

    Head private _head;
    address private _service;
    PoolToken public token;
    uint public totalStake;
    uint public maxTotalStake;
    Consts.NodeType public nodeType;
    uint public nodeStake;
    uint public minStakeValue;
    address[] public nodes;
    uint public fee;
    bool public active;
    uint private _requestStake;
    uint private _requestId;
    string public name;
    uint public id;

    // todo: Is it really necessary?
    function() public payable {}

    modifier onlyService() {
        require(address(msg.sender) == _service, "The message sender is not service");
        _;
    }

    function getVersion() public pure returns (string) {
        return "0.0.4";
    }

    // todo use Ownable constructor?
    constructor(string memory poolName, Consts.NodeType poolNodeType, uint poolNodeStake, uint poolMinStakeValue,
        uint poolFee, address service, address head, uint poolMaxTotalStake) public {
        require(poolNodeStake > 0, "Pool node stake value is zero"); // node stake value is used as a divisor
        require(poolMinStakeValue > 0, "Pool min stake value is zero");
        require(poolFee >= 0 && poolFee < MILLION, "Pool fee must be from 0 to 1000000");
        require(service != address(0x0), "Service must not be 0x0");
        require(head != address(0x0), "Head must not be 0x0");
        _head = Head(head);
        _service = service;
        token = new PoolToken();
        nodeType = poolNodeType;
        nodeStake = poolNodeStake;
        minStakeValue = poolMinStakeValue;
        maxTotalStake = poolMaxTotalStake;
        fee = poolFee;
        name = poolName;
        id = _getManager().nextId();
    }

    function activate() public payable onlyOwner {
        require(!active, "Pool is already active");
        require(msg.value == nodeStake, "Send value not equals node stake value");
        active = true;
        _onboardNodes();
    }

    function deactivate(uint maxNodes) public onlyOwner {
        require(active, "Pool is not active");
        while (nodes.length > 0 && maxNodes > 0) {
            _removeNode();
            maxNodes--;
        }
        if (nodes.length == 0) {
            active = false;
            msg.sender.transfer(nodeStake);
        }
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
        require(msg.value >= minStakeValue, "Pool: stake value too low");
        require(maxTotalStake == 0 || msg.value.add(totalStake) <= maxTotalStake, "Pool: stake value too high");
        uint tokenPrice = getTokenPrice();
        uint tokens = msg.value.mul(FIXEDPOINT).div(tokenPrice);

        // todo return (msg.value % tokenPrice) to user ?
        token.mint(msg.sender, tokens);
        totalStake = totalStake.add(msg.value);
        _getManager().poolStakeChanged(msg.sender, int(msg.value), int(tokens));
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
        msg.sender.transfer(deposit);
        _getManager().poolStakeChanged(msg.sender, -int(deposit), -int(tokens));
    }

    function viewStake() public view returns (uint) {
        return token.balanceOf(msg.sender);
    }

    function getTokenPrice() public view returns (uint) {
        uint total = token.totalSupply();
        if (total > 0) {
            return totalStake.mul(FIXEDPOINT).div(total);
        }
        return 1 ether;
    }

    function _onboardNodes() private {
        if (active && _requestStake == 0 && address(this).balance >= nodeStake) {
            _requestStake = nodeStake;
            _getManager().addNodeRequest(_requestStake, ++_requestId, nodes.length, nodeType);
        }
    }

    function addReward() public payable {
        uint reward;
        if (nodes.length > 0) {
            reward = msg.value;
            if (nodes[0] == msg.sender) {
                uint ownerStake = nodeStake - (totalStake % nodeStake);
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
                _getManager().poolReward(reward, getTokenPrice());
            }
        }
        owner.transfer(msg.value.sub(reward));
        _onboardNodes();
    }

    function addNode(uint requestId, address node, uint nodeId) public onlyService {
        require(node != address(0), "Node can not be zero");
        require(_requestStake > 0, "No active requests");
        uint status;
        if (active && requestId == _requestId) {
            if (nodeId == nodes.length && address(this).balance >= _requestStake) {
                _getManager().onboard.value(_requestStake)(node, nodeType);
                nodes.push(node);
                status = 1;
            }
        }
        _getManager().addNodeRequestResolved(requestId, status);
        _requestStake = 0;
        _onboardNodes();
    }

    function _removeNode() private {
        _getManager().retire(nodes[nodes.length-1], nodeType);
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

    function _getManager() private view returns (PoolsNodesManager) {
        return _head.context().catalogue().poolsNodesManager();
    }
}
