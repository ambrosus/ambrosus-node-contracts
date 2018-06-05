/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Storage/BundleRegistry.sol";
import "../Storage/StakeStore.sol";
import "../Storage/KycWhitelist.sol";


contract Context {

    BundleRegistry public bundleRegistry;
    StakeStore public stakeStore;
    KycWhitelist public kycWhitelist;
    Roles public roles;
    
    constructor(BundleRegistry _bundleRegistry, StakeStore _stakeStore, KycWhitelist _kycWhitelist, Roles _roles) public {
        bundleRegistry = _bundleRegistry;
        stakeStore = _stakeStore;
        kycWhitelist = _kycWhitelist;
        roles = _roles;
    }

    function isInternalToContext(address contractAddress) view public returns (bool) {
        return bundleRegistry == contractAddress || stakeStore == contractAddress || kycWhitelist == contractAddress || roles == contractAddress;
    
    }
}
