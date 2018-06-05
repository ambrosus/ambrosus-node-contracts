/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Context.sol";


contract MockContext is Context {
    mapping(address => bool) whitelist;

    constructor(BundleRegistry _bundleRegistry, StakeStore _stakeStore, KycWhitelist _kycWhitelist, Roles _roles) 
        Context(_bundleRegistry, _stakeStore, _kycWhitelist, _roles) public {
    }

    function addToWhitelist(address[] whitelisted) public {
        for (uint i = 0; i < whitelisted.length; i++) {
            whitelist[whitelisted[i]] = true;
        }
    }

    function removeFromWhitelist(address[] unWhitelisted) public {
        for (uint i = 0; i < unWhitelisted.length; i++) {
            whitelist[unWhitelisted[i]] = false;
        }
    }

    function isInternalToContext(address contractAddress) view public returns (bool) {
        return super.isInternalToContext(contractAddress) || whitelist[contractAddress];
    }
}
