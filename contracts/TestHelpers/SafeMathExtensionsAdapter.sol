pragma solidity ^0.4.23;

import "../Lib/SafeMathExtensions.sol";


contract SafeMathExtensionsAdapter {
    function mod(uint256 a, uint256 b) public pure returns (uint256) {
        return SafeMathExtensions.mod(a, b);
    }

    function safePow2(uint exponent) public pure returns (uint256) {
        return SafeMathExtensions.safePow2(exponent);
    }

    function castTo8(uint256 a) public pure returns (uint8) {
        return SafeMathExtensions.castTo8(a);
    }

    function castTo32(uint256 a) public pure returns (uint32) {
        return SafeMathExtensions.castTo32(a);
    }

    function castTo64(uint256 a) public pure returns (uint64) {
        return SafeMathExtensions.castTo64(a);
    }

    function castTo128(uint256 a) public pure returns (uint128) {
        return SafeMathExtensions.castTo128(a);
    }
}
