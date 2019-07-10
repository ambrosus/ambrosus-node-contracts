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

    uint constant public DMP_PRECISION = 10000;


    function qualifyShelterer(bytes32 dmpBaseHash, uint dmpLength, uint currentRound) internal pure returns (uint32) {
        return uint32(uint256(keccak256(abi.encodePacked(dmpBaseHash, currentRound))).mod(dmpLength));
    }

    function selectingAtlasTier(bytes32 dmpBaseHash, uint[] atlasCount, uint[] ATLAS_NUMERATOR) internal pure returns (uint32) {
        require(atlasCount.length == ATLAS_NUMERATOR.length);

        uint[] memory wcd = calculateWcd(atlasCount, ATLAS_NUMERATOR);

        uint32 tier = selectRandomlyFrom(dmpBaseHash, wcd);

        return tier;
    }

    function calculateDenominator(uint[] atlasCount, uint[] ATLAS_NUMERATOR) private pure returns (uint) {
        uint denominator = 0;
        for (uint tier = 0; tier < ATLAS_NUMERATOR.length; tier++) {
            uint elem = atlasCount[tier].mul(ATLAS_NUMERATOR[tier]);
            denominator = denominator.add(elem);
        }
        return denominator;
    }

    function calculateWcd(uint[] atlasCount, uint[] ATLAS_NUMERATOR) private pure returns (uint[]) {
        uint[] memory wcd = new uint[](ATLAS_NUMERATOR.length);
        uint currentWCD = 0;
        uint denominator = calculateDenominator(atlasCount, ATLAS_NUMERATOR);

        for (uint tier = 0; tier < ATLAS_NUMERATOR.length; tier++) {
            uint currentNum = atlasCount[tier].mul(ATLAS_NUMERATOR[tier]);

            currentNum = currentNum.mul(DMP_PRECISION).div(denominator);
            currentWCD = currentWCD.add(currentNum);
            wcd[tier] = currentWCD;
        }

        for (tier = ATLAS_NUMERATOR.length - 1; tier >= 0; tier--) {
            if (wcd[tier] != 0) {
                wcd[tier] = DMP_PRECISION;
                break;
            }
        }
        return wcd;
    }

    function selectRandomlyFrom(bytes32 dmpBaseHash, uint[] wcd) private pure returns (uint32) {
        uint randomNumber = uint(dmpBaseHash).mod(DMP_PRECISION);
        for (uint32 tier = 0; tier < wcd.length; tier++) {
            if (wcd[tier] != 0 && randomNumber <= wcd[tier]) {
                break;
            }
        }
        return tier;
    }
}
