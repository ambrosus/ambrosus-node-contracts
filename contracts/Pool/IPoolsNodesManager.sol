pragma solidity ^0.4.23;

import "../Configuration/Consts.sol";

interface IPoolsNodesManager {

    function onboard(Consts.NodeType nodeType) external payable returns (address);
    function retire(address nodeAddress) external returns (uint);
}
