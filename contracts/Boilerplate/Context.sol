/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Storage/BundleRegistry.sol";
import "../Storage/StakeStore.sol";
import "../Storage/BundleStore.sol";
import "../Storage/KycWhitelist.sol";

import "../Front/Stakes.sol";


contract Context {

    BundleRegistry public bundleRegistry;
    StakeStore public stakeStore;
    BundleStore public bundleStore;
    KycWhitelist public kycWhitelist;
    Roles public roles;
    Stakes public stakes;

    constructor(
        BundleRegistry _bundleRegistry,
        StakeStore _stakeStore,
        BundleStore _bundleStore,
        KycWhitelist _kycWhitelist,
        Roles _roles,
        Stakes _stakes
    ) public {
        bundleRegistry = _bundleRegistry;
        stakeStore = _stakeStore;
        bundleStore = _bundleStore;
        kycWhitelist = _kycWhitelist;
        roles = _roles;
        stakes = _stakes;
    }

    function isInternalToContext(address contractAddress) view public returns (bool) {
        // solium-disable-next-line operator-whitespace
        return bundleRegistry == contractAddress ||
            stakeStore == contractAddress ||
            bundleStore == contractAddress ||
            kycWhitelist == contractAddress ||
            roles == contractAddress ||
            stakes == contractAddress;
    }
}
