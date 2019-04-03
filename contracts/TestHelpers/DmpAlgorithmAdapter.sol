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
        bytes32 dmpBaseHash = keccak256(abi.encodePacked(challengeId, sequenceNumber));
        return dmpBaseHash;
    }

    function getQualifyHash(bytes32 challengeId, uint sequenceNumber, uint currentRound) public pure returns (bytes32) {
        bytes32 dmpBaseHash = getBaseHash(challengeId, sequenceNumber);
        bytes32 qualifyHash = keccak256(abi.encodePacked(dmpBaseHash, currentRound));
        return qualifyHash;
    }

    function qualifyShelterer(bytes32 dmpBaseHash, uint dmpLength, uint currentRound) public pure returns (uint32) {
        return DmpAlgorithm.qualifyShelterer(dmpBaseHash, dmpLength, currentRound);
    }

    function qualifyShelterTypeStake(bytes32 dmpBaseHash, uint[] atlasCount, uint[] ATLAS_NUMERATOR, uint32 length) public pure returns (uint32) {
        return DmpAlgorithm.qualifyShelterTypeStake(dmpBaseHash, atlasCount, ATLAS_NUMERATOR, length);
    }
}