/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Catalogue.sol";


contract Context {
    mapping (address => bool) public trustedAddresses;
    Catalogue public catalogue;
    StorageCatalogue public storageCatalogue;
    string public versionTag;

    constructor(address[] _trustedAddresses, Catalogue _catalogue, StorageCatalogue _storageCatalogue, string _versionTag) public {
        require(_trustedAddresses.length > 0);
        require(_catalogue != address(0));
        require(_storageCatalogue != address(0));

        for (uint i = 0; i < _trustedAddresses.length; i++) {
            trustedAddresses[_trustedAddresses[i]] = true;
        }
        catalogue = _catalogue;
        storageCatalogue = _storageCatalogue;
        versionTag = _versionTag;
    }

    function isInternalToContext(address contractAddress) view public returns (bool) {
        return trustedAddresses[contractAddress];
    }
}
