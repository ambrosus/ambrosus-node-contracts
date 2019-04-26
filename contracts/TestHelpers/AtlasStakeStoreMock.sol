/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Storage/AtlasStakeStore.sol";


contract AtlasStakeStoreMock is AtlasStakeStore {

    uint32 numberOfStakers;

    constructor(Head _head) public AtlasStakeStore(_head) {
    }

    function setNumberOfStakers(uint32 _numberOfStakers) public {
        numberOfStakers = _numberOfStakers;
    }

    function getNumberOfStakers() public view returns (uint32) {
        return numberOfStakers;
    }

    function setStakeAmount(address node, uint amount) public {
        stakes[node].amount = amount;
    }

    function removeLastStaker(address node, uint amount) public {
        --stakesIndex.length;

        --stakesIndexGrouped[amount].length;

        stakes[node].initialAmount = 0;
        stakes[node].amount = 0;
        stakes[node].shelteredBundlesCount = 0;        
    }
}
