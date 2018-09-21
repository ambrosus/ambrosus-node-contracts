/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Catalogue.sol";


contract Context {
    mapping (address => bool) public trustedAddresses; 
    Catalogue public catalogue;

    constructor(address[] _trustedAddresses, Catalogue _catalogue) public {
        for (uint i = 0; i < _trustedAddresses.length; i++) {
            trustedAddresses[_trustedAddresses[i]] = true;
        }
        catalogue = _catalogue;
    }

    function isInternalToContext(address contractAddress) view public returns (bool) {
        return trustedAddresses[contractAddress];
    }
}
