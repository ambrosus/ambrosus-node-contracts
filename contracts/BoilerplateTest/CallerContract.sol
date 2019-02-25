/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "./CalledContract.sol";


contract CallerContract is Base {
    CalledContract otherContract;

    constructor(Head _head, CalledContract _otherContract) Base(_head) public{
        otherContract = _otherContract;
    }

    function callOtherContract() view public {
        otherContract.contextInternalMethod();
    }
}
