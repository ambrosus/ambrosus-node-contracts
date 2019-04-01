/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

contract DMPalgorithmAdapter {
    function getBaseHash(bytes32 challengeId, uint sequenceNumber) public pure returns (bytes32) {
        bytes32 DMPbaseHash = keccak256(abi.encodePacked(challengeId, sequenceNumber));
        return DMPbaseHash;
    }

    function getQualifyHash(bytes32 challengeId, uint sequenceNumber, uint currentRound) public pure returns (bytes32) {
        bytes32 DMPbaseHash = getBaseHash(challengeId, sequenceNumber);
        bytes32 qualifyHash = keccak256(abi.encodePacked(DMPbaseHash, currentRound));
        return qualifyHash;
    }
}