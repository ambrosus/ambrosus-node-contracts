/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;


library SafeMathExtensions {
    function safePow2(uint exponent) pure public returns (uint) {
        require(exponent < 256);
        return 2 ** exponent;        
    }

    function mod(uint256 a, uint256 b) pure public returns (uint) {
        return a % b; //modulo is overflow safe   
    }
}
