/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Storage/BundleRegistry.sol";
import "../Storage/StakeStore.sol";


contract Context {

    BundleRegistry public bundleRegistry;
    StakeStore public stakeStore;

    constructor(BundleRegistry _bundleRegistry, StakeStore _stakeStore) public {
        bundleRegistry = _bundleRegistry;
        stakeStore = _stakeStore;
    }

    function isInternalToContext(address contractAddress) view public returns (bool) {
        return bundleRegistry == contractAddress || stakeStore == contractAddress;
    }
}
