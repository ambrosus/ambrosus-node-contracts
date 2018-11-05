/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Storage/AtlasStakeStore.sol";


contract AtlasStakeStoreMock is AtlasStakeStore {

    constructor(Head _head) public AtlasStakeStore(_head) {
    }

    function setStorageUsed(address node, uint storageUsed) public {
        stakes[node].storageUsed = storageUsed;
    }

    function setNumberOfStakers(uint32 _numberOfStakers) public {
        numberOfStakers = _numberOfStakers;
    }

    function setStakeAmount(address node, uint amount) public {
        stakes[node].amount = amount;
    }
}
