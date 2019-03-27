/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "./SafeMathExtensions.sol";
import "../Configuration/Config.sol";
import "../Storage/AtlasStakeStore.sol";

library DMPalgorithm {
    using SafeMath for uint;
    using SafeMath for uint32;
    using SafeMath for uint64;
    using SafeMathExtensions for uint;

    uint constant public DMP_PRECISION = 100;
    uint constant public ROUND_DURATION = 10 minutes;
    uint constant public FIRST_PHASE_DURATION = 2 days;

    function getCurrentRound(uint64 creationTime) internal view returns (uint) {
        return (now.castTo64() - creationTime).div(ROUND_DURATION);
    }

    function isFirstPhase(uint currentRound) internal pure returns (bool) {
        return currentRound < FIRST_PHASE_DURATION.div(ROUND_DURATION);
    }

    function getBaseHash(bytes32 challengeId, uint sequenceNumber) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(challengeId, sequenceNumber));
    }

    function qualifyShelterer(bytes32 DMPbaseHash, uint DMPlength, uint currentRound) internal pure returns (uint32) {
        return uint32(uint256(keccak256(abi.encodePacked(DMPbaseHash, currentRound))).mod(DMPlength));
    }

    function qualifyShelterTypeStake(bytes32 DMPbaseHash, uint[] atlasCount, uint[] ATLAS_NUMERATOR, uint length) internal pure returns (uint) {
        uint256 denominator = 0;
        uint currentWCD = 0;
        uint[] memory wcd = new uint[](length);
        uint randomNumber;
        uint chosenStake = length - 1;
        uint i;
        uint numeratorSum = 0;

        for (i = 0; i < length; i++) {
            denominator.add(atlasCount[i]).mul(ATLAS_NUMERATOR[i]);
            numeratorSum.add(ATLAS_NUMERATOR[i]);
        }

        for (i = 0; i < length - 1; i++) {
            uint currentNum = atlasCount[i].mul(ATLAS_NUMERATOR[i]).mul(DMP_PRECISION);
            currentWCD.add(currentNum.div(denominator));
            wcd[i] = currentWCD;
        }
        wcd[i] = (numeratorSum.mul(DMP_PRECISION) - currentWCD);

        randomNumber = uint(DMPbaseHash).mod(numeratorSum.mul(DMP_PRECISION));

        for (i = 0; i < length; i++) {
            if (randomNumber <= wcd[i]) {
                chosenStake = i;
                break;
            }
        }
        delete wcd;

        return chosenStake;
    }
    function getDMPtypeShelterer(bytes32 DMPbaseHash, Config config, AtlasStakeStore atlasStakeStore) internal view returns(uint, uint) {
        uint DMPtype;
        uint length = config.ATLAS_TYPES();
        uint[] memory atlasTypeCounts = new uint[](length);
        uint[] memory atlasNumerators = new uint[](length);
        uint i;
        uint atlasCount;

        for (i = 0; i < length; i++) {
            atlasTypeCounts[i] = atlasStakeStore.getNumberOfStakersWithStake(config.ATLAS_STAKE(i));
            atlasNumerators[i] = config.ATLAS_NUMERATOR(i);
        }

        DMPtype = qualifyShelterTypeStake(DMPbaseHash, atlasTypeCounts, atlasNumerators, length);
        atlasCount = atlasTypeCounts[DMPtype];

        delete atlasTypeCounts;
        delete atlasNumerators;

        return (atlasCount, config.ATLAS_STAKE(DMPtype));
    }

      function getDMPshelterer(bytes32 challengeId, uint64 creationTime, uint sequenceNumber, Config config, AtlasStakeStore atlasStakeStore) internal view returns (address) {
        uint currentRound = getCurrentRound(creationTime);
        bytes32 DMPbaseHash = getBaseHash(challengeId, sequenceNumber);
        bool bIsFirstPhase = isFirstPhase(currentRound);
        address DMPshelterer;
        uint32 DMPindex;
        uint atlasCount;
        uint DMPstake;

        if (bIsFirstPhase) {
            (atlasCount, DMPstake) = getDMPtypeShelterer(DMPbaseHash, config, atlasStakeStore);
        }
        else {
            atlasCount = atlasStakeStore.getNumberOfStakers();
        }
        DMPindex = qualifyShelterer(DMPbaseHash, atlasCount, currentRound);

        if (bIsFirstPhase) {
            DMPshelterer = atlasStakeStore.getStakerWithStakeAtIndex(DMPstake, DMPindex);
        }
        else {
            DMPshelterer = atlasStakeStore.getStakerAtIndex(DMPindex);
        }

        return DMPshelterer;
    }
}
