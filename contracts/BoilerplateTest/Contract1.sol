/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "./Contract2.sol";

contract Contract1 is Base {
    Contract2 otherContract;

    constructor(Head _head, Contract2 _otherContract) Base(_head) {
        otherContract = _otherContract;
    }

    function callOtherContract() view public {
        otherContract.contextInternalMethod();
    }
}
