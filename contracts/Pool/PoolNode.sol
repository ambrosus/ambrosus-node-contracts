pragma solidity ^0.4.23;

import "../Consensus/ConstructorOwnable.sol";

contract PoolNode is ConstructorOwnable {
    address private pool;

    constructor(address owner) ConstructorOwnable(owner) {
    }

    function() public payable {}

    function setPool(address newPool) public onlyOwner() {
        pool = newPool;
    }

    function withdraw() public returns (uint) {
        require(msg.sender == pool, "Only pool allowed");
        uint reward = address(this).balance;
        msg.sender.transfer(reward);
        return reward;
    }
}
