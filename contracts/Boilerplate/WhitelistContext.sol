/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

contract WhitelistContext {
    address[] allowed;

    constructor(address[] _allowed) public{
        allowed = _allowed;
    }

    function canCall(address contractAddress) view public returns (bool) {
        for (uint i = 0; i < allowed.length; i++) {
            if (allowed[i]==contractAddress) {
                return true;
            }
        }
        return false;
    }
}
