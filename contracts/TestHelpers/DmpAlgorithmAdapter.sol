/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Lib/DmpAlgorithm.sol";


contract DmpAlgorithmAdapter {
    function getBaseHash(bytes32 challengeId, uint sequenceNumber) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(challengeId, sequenceNumber));
    }

    function qualifyShelterer(bytes32 dmpBaseHash, uint dmpLength, uint currentRound) public pure returns (uint32) {
        return DmpAlgorithm.qualifyShelterer(dmpBaseHash, dmpLength, currentRound);
    }

    function selectingAtlasTier(bytes32 dmpBaseHash, uint[] atlasCount, uint[] ATLAS_NUMERATOR) public pure returns (uint32) {
        return DmpAlgorithm.selectingAtlasTier(dmpBaseHash, atlasCount, ATLAS_NUMERATOR);
    }
}
