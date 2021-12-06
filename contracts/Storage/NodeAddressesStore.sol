pragma solidity ^0.4.23;

import "../Configuration/Consts.sol";
import "../Boilerplate/Head.sol";


contract NodeAddressesStore is Base {

    event NodeAddressesAdded(address staking, address operating);
    event NodeAddressesRemoved(address staking, address operating);

    mapping(address => address) public operating;
    mapping(address => address) public staking;

    constructor(Head _head) public Base(_head) { }

    function addNode(address _staking, address _operating) public onlyContextInternalCalls {
        require(_staking != address(0), "Staking address must not be 0x0");
        require(_operating != address(0), "Operating address must not be 0x0");
        operating[_staking] = _operating;
        staking[_operating] = _staking;
        emit NodeAddressesAdded(_staking, _operating);
    }

    function removeNode(address _staking) public onlyContextInternalCalls {
        address _operating = operating[_staking];
        if (address(0) != _operating) {
            delete operating[_staking];
            delete staking[_operating];
            emit NodeAddressesRemoved(_staking, _operating);
        }
    }
}
