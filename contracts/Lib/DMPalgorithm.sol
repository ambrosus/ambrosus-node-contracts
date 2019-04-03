/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "./SafeMathExtensions.sol";


library DmpAlgorithm {
    using SafeMath for uint;
    using SafeMath for uint32;
    using SafeMath for uint64;
    using SafeMathExtensions for uint;

    uint constant public DMP_PRECISION = 100;


    function qualifyShelterer(bytes32 dmpBaseHash, uint dmpLength, uint currentRound) internal pure returns (uint32) {
        return uint32(uint256(keccak256(abi.encodePacked(dmpBaseHash, currentRound))).mod(dmpLength));
    }

    function qualifyShelterTypeStake(bytes32 dmpBaseHash, uint[] atlasCount, uint[] ATLAS_NUMERATOR, uint32 length) internal pure returns (uint32) {
        uint denominator = 0;
        uint32 i = 0;

        for (i = 0; i < length; i++) {
            uint elem = atlasCount[i].mul(ATLAS_NUMERATOR[i]);
            denominator = denominator.add(elem);
        }

        uint currentWCD = 0;
        uint[] memory wcd = new uint[](length);

        for (i = 0; i < length - 1; i++) {
            uint currentNum = atlasCount[i].mul(ATLAS_NUMERATOR[i]);
            if (currentNum == 0) {
                wcd[i] = 0;
            }
            if (currentNum == denominator) {
                wcd[i] = DMP_PRECISION;
                currentWCD = DMP_PRECISION;
            } else {
                currentNum = currentNum.mul(DMP_PRECISION).div(denominator);
                currentWCD = currentWCD.add(currentNum);
                wcd[i] = currentWCD;
            }
        }
        wcd[length-1] = DMP_PRECISION;

        uint32 chosenStake = length - 1;
        uint randomNumber = uint(dmpBaseHash).mod(DMP_PRECISION);
        for (i = 0; i < length; i++) {
            if (wcd[i] != 0 && randomNumber <= wcd[i]) {
                chosenStake = i;
                break;
            }
        }

        return chosenStake;
    }
}