/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;


library SafeMathExtensions {
    /**
     * @dev Casts to uint8, throws on overflow.
     */
    function castTo8(uint256 a) internal pure returns (uint8 c) {
        c = uint8(a);
        assert(a == c);
        return c;
    }

    /**
     * @dev Casts to uint32, throws on overflow.
     */
    function castTo32(uint256 a) internal pure returns (uint32 c) {
        c = uint32(a);
        assert(a == c);
        return c;
    }

    /**
     * @dev Casts to uint64, throws on overflow.
     */
    function castTo64(uint256 a) internal pure returns (uint64 c) {
        c = uint64(a);
        assert(a == c);
        return c;
    }

    /**
     * @dev Casts to uint128, throws on overflow.
     */
    function castTo128(uint256 a) internal pure returns (uint128 c) {
        c = uint128(a);
        assert(a == c);
        return c;
    }

    function safePow2(uint exponent) internal pure returns (uint256) {
        require(exponent < 256);
        return 2 ** exponent;
    }

    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return a % b; //modulo is overflow safe
    }
}
