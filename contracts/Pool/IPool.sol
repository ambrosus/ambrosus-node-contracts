pragma solidity ^0.4.23;

interface IPool {
    function getVersion() external view returns (string);
    function activate() external payable;
    function deactivate(uint maxNodes) external;
    function setService(address newService) external;
    function setName(string newName) external;
    function stake() external payable;
    function unstake(uint tokens) external;
    function viewStake() external view returns (uint);
    function getTokenPrice() external view returns (uint);
    function addReward() external payable;
    function getNodesCount() external view returns(uint);
    function getNodes(uint from, uint to) external view returns (address[] _nodes);
}
