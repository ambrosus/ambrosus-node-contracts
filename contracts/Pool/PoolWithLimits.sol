pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../Lib/SafeMathExtensions.sol";
import "./IPool.sol";
import "../Boilerplate/Head.sol";
import "../Boilerplate/Context.sol";
import "../Boilerplate/Catalogue.sol";
import "./PoolsNodesManager.sol";
import "./PoolToken.sol";


contract PoolWithLimits is IPool, Ownable {

    using SafeMath for uint;
    using SafeMathExtensions for uint;

    uint constant private MILLION = 1000000;
    uint constant private FIXEDPOINT = 1 ether;

    struct Stake {
        uint64 time;
        uint stake;
        uint tokens;
    }

    struct Staker {
        bool exists;
        uint total;
        Stake[] stakes;
    }

    struct UnstakeFee {
        uint64 age;
        uint32 fee;
    }

    Head private _head;
    address public service;
    PoolToken public token;
    uint public totalStake;
    uint public totalReward;
    uint public maxTotalStake;
    uint public maxUserTotalStake;
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
    UnstakeFee[] public unstakeFees;
    mapping(address => Staker) public stakers;

    // todo: Is it really necessary?
    function() public payable {}

    modifier onlyService() {
        require(address(msg.sender) == service, "The message sender is not service");
        _;
    }

    function getVersion() external view returns (string) {
        return "0.0.4";
    }

    // todo use Ownable constructor?
    constructor(string memory poolName, Consts.NodeType poolNodeType, uint poolNodeStake, uint poolMinStakeValue,
        uint poolFee, address poolService, address head, uint poolMaxTotalStake, uint poolMaxUserTotalStake) public {
        require(poolNodeStake > 0, "Pool node stake value is zero"); // node stake value is used as a divisor
        require(poolMinStakeValue > 0, "Pool min stake value is zero");
        require(poolFee >= 0 && poolFee < MILLION, "Pool fee must be from 0 to 1000000");
        require(poolService != address(0x0), "Service must not be 0x0");
        require(head != address(0x0), "Head must not be 0x0");
        _head = Head(head);
        service = poolService;
        token = new PoolToken();
        nodeType = poolNodeType;
        nodeStake = poolNodeStake;
        minStakeValue = poolMinStakeValue;
        maxTotalStake = poolMaxTotalStake;
        maxUserTotalStake = poolMaxUserTotalStake;
        fee = poolFee;
        name = poolName;
        id = _getManager().nextId();
    }

    function activate() external payable onlyOwner {
        require(!active, "Pool is already active");
        require(msg.value == nodeStake, "Send value not equals node stake value");
        active = true;
        _onboardNodes();
    }

    function deactivate(uint maxNodes) external onlyOwner {
        require(active, "Pool is not active");
        while (nodes.length > maxNodes) {
            _removeNode();
        }
        if (nodes.length == 0) {
            active = false;
            msg.sender.transfer(nodeStake);
        }
    }

    function setService(address newService) external onlyOwner {
        require(newService != address(0x0), "Service must not be 0x0");
        service = newService;
    }

    function setName(string newName) external onlyOwner {
        name = newName;
    }

    function stake() external payable {
        require(active, "Pool is not active");
        require(msg.value >= minStakeValue, "Pool: stake value too low");
        require(maxTotalStake == 0 || msg.value.add(totalStake) <= maxTotalStake, "Pool: stake value too high");

        if (maxUserTotalStake != 0 && stakers[msg.sender].exists) {
            require(stakers[msg.sender].total.add(msg.value) <= maxUserTotalStake, "Pool: limit for user stake value");
        }

        uint tokenPrice = this.getTokenPrice();
        uint tokens = msg.value.mul(FIXEDPOINT).div(tokenPrice);

        if (!stakers[msg.sender].exists) {
            stakers[msg.sender].exists = true;
        }
        stakers[msg.sender].total = stakers[msg.sender].total.add(msg.value);
        stakers[msg.sender].stakes.push(Stake(now.castTo64(), msg.value, tokens));

        // todo return (msg.value % tokenPrice) to user ?
        token.mint(msg.sender, tokens);
        totalStake = totalStake.add(msg.value);
        _getManager().poolStakeChanged(msg.sender, int(msg.value), int(tokens));
        _onboardNodes();
    }

    function unstake(uint tokens) external {
        require(tokens <= token.balanceOf(msg.sender), "Sender has not enough tokens");

        Staker storage staker = stakers[msg.sender];
        uint idx = staker.stakes.length;
        uint i;
        for (; i < staker.stakes.length; i++) {
            if (staker.stakes[i].tokens == tokens) {
                if (idx < i) {
                    if (staker.stakes[i].time < staker.stakes[idx].time) {
                        idx = i;
                    }
                } else {
                    idx = i;
                }
            }
        }
        require(idx < staker.stakes.length, "Sender has no available stakes");

        require(getUnstakeFee(staker.stakes[idx].time) == 0, "Sender must pay an unstake fee");

        uint tokenPrice = this.getTokenPrice();
        uint deposit = tokenPrice.mul(tokens).div(FIXEDPOINT);
        require(deposit <= totalStake.add(totalReward), "Total stake is less than deposit");

        token.burn(msg.sender, tokens);
        while (address(this).balance < deposit) {
            _removeNode();
        }

        msg.sender.transfer(deposit);
        _getManager().poolStakeChanged(msg.sender, -int(deposit), -int(tokens));

        if (deposit <= totalReward) {
            totalReward = totalReward.sub(deposit);
            deposit = 0;
        } else {
            deposit = deposit.sub(totalReward);
            totalReward = 0;
        }
        if (deposit > 0) {
            totalStake = totalStake.sub(deposit);
        }

        if (idx != staker.stakes.length - 1) {
            staker.stakes[idx] = staker.stakes[staker.stakes.length - 1];
        }
        staker.stakes.length -= 1;
    }

    function addUnstakeFee(uint64 age, uint32 unstakeFee) external onlyOwner {
        uint i;
        for (; i < unstakeFees.length; i++) {
            if (unstakeFees[i].age == age) {
                break;
            }
        }
        require(i == unstakeFees.length, "Fee for the age alreay exists");
        unstakeFees.push(UnstakeFee(age, unstakeFee));
        if (unstakeFees.length > 1) {
            bool updated = true;
            while (updated) {
                updated = false;
                for (i = 0; i < unstakeFees.length - 1; i++) {
                    if (unstakeFees[i].age > unstakeFees[i + 1].age) {
                        uint64 tmp = unstakeFees[i].age;
                        unstakeFees[i].age = unstakeFees[i + 1].age;
                        unstakeFees[i + 1].age = tmp;
                        updated = true;
                    }
                }
            }
        }
    }

    function changeUnstakeFee(uint64 age, uint32 unstakeFee) external onlyOwner {
        uint i;
        for (; i < unstakeFees.length; i++) {
            if (unstakeFees[i].age == age) {
                break;
            }
        }
        require(i < unstakeFees.length, "Fee for the age not found");
        unstakeFees[i].fee = unstakeFee;
    }

    function removeUnstakeFee(uint64 age) external onlyOwner {
        uint i;
        for (; i < unstakeFees.length; i++) {
            if (unstakeFees[i].age == age) {
                break;
            }
        }
        require(i < unstakeFees.length, "Fee for the age not found");
        if (i != unstakeFees.length - 1) {
            unstakeFees[i] = unstakeFees[unstakeFees.length - 1];
        }
        unstakeFees.length -= 1;
    }

    function getUnstakeFee(uint64 time) public view returns (uint) {
        if (unstakeFees.length > 0) {
            uint64 age = now.castTo64() - time;
            if (unstakeFees[unstakeFees.length - 1].age >= age) {
                uint i;
                for (; i < unstakeFees.length; i++) {
                    if (unstakeFees[i].age <= age) {
                        return unstakeFees[i].fee;
                    }
                }
            }
        }
        return 0;
    }

    function getStake() public view returns (uint) {
        return stakers[msg.sender].total;
    }

    function viewStake() external view returns (uint) {
        return token.balanceOf(msg.sender);
    }

    function getTokenPrice() external view returns (uint) {
        uint total = token.totalSupply();
        if (total > 0) {
            return totalStake.add(totalReward).mul(FIXEDPOINT).div(total);
        }
        return 1 ether;
    }

    function _onboardNodes() private {
        if (active && _requestStake == 0 && address(this).balance >= nodeStake) {
            _requestStake = nodeStake;
            _getManager().addNodeRequest(_requestStake, ++_requestId, nodes.length, nodeType);
        }
    }

    function addReward() external payable {
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
                // totalStake = totalStake.add(reward);
                totalReward = totalReward.add(reward);
                _getManager().poolReward(reward, this.getTokenPrice());
            }
        }
        owner.transfer(msg.value.sub(reward));
        _onboardNodes();
    }

    function addNode(uint requestId, address node, uint nodeId) external onlyService {
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

    function getNodesCount() external view returns(uint) {
        return nodes.length;
    }

    function getNodes(uint from, uint to) external view returns (address[] _nodes) {
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
