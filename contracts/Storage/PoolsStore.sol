pragma solidity ^0.4.23;

import "../Configuration/Consts.sol";
import "../Boilerplate/Head.sol";


contract PoolsStore is Base {

    event PoolAdded(address poolAddress);
    event PoolRemoved(address poolAddress);

    mapping(address => bool) public isPool;
    address[] public pools;

    constructor(Head _head) public Base(_head) { }

    function addPool(address pool) public onlyContextInternalCalls {
        require(!isPool[pool], "Pool already registered");
        require(pool != address(0), "Pool must not be 0x0");
        isPool[pool] = true;
        pools.push(pool);
        emit PoolAdded(pool);
    }

    function removePool(address pool) public onlyContextInternalCalls {
        require(isPool[pool], "Pool not registered");
        delete isPool[pool];
        for (uint i = 0; i < pools.length - 1; i++) {
            if (pools[i] == pool) {
                pools[i] = pools[pools.length - 1];
                delete pools[pools.length - 1];
                pools.length -= 1;
                break;
            }
        }
        emit PoolRemoved(pool);
    }
}
