/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23 ;

import "../Boilerplate/Head.sol";


contract CalledContract is Base {
    constructor(Head _head) Base(_head) public { }

    function() public payable {}

    function contextInternalMethod() view onlyContextInternalCalls public { }
}
