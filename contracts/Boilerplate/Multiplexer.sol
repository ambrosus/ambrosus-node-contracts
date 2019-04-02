/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";


contract Multiplexer is ConstructorOwnable {
    Head public head;

    constructor(address _owner, Head _head) public ConstructorOwnable(_owner) {
        head = _head;
    }

    function transferContractsOwnership(address newOwner) public onlyOwner {
        head.transferOwnership(newOwner);
    } 
}
