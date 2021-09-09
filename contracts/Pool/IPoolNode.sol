pragma solidity ^0.4.23;

interface IPoolNode {
    function withdraw() external returns (uint);
    function setPool(address newPool) external;
}
