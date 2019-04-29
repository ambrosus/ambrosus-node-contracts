/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Context.sol";


contract MockContext is Context {
    mapping(address => bool) whitelist;

    constructor(address[] _trustedAddresses, Catalogue _catalogue, StorageCatalogue _storageCatalogue, string _versionTag)
    Context(_trustedAddresses, _catalogue, _storageCatalogue, _versionTag) public {}

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

    function isInternalToContext(address contractAddress) public view returns (bool) {
        return super.isInternalToContext(contractAddress) || whitelist[contractAddress];
    }
}
