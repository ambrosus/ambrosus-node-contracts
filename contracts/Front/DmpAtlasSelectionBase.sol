/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../Configuration/Config.sol";
import "../Configuration/Time.sol";
import "../Lib/SafeMathExtensions.sol";
import "../Lib/DmpAlgorithm.sol";
import "../Boilerplate/Head.sol";
import "../Middleware/Sheltering.sol";
import "../Storage/AtlasStakeStore.sol";


contract DmpAtlasSelectionBase is Base {

    using SafeMath for uint;
    using SafeMath for uint32;
    using SafeMath for uint64;
    using SafeMathExtensions for uint;

    Time internal time;
    Sheltering internal sheltering;
    AtlasStakeStore internal atlasStakeStore;
    Config internal config;

    constructor(Head _head, Time _time, Sheltering _sheltering, AtlasStakeStore _atlasStakeStore, Config _config)
    internal Base(_head)
    {
        time = _time;
        sheltering = _sheltering;
        atlasStakeStore = _atlasStakeStore;
        config = _config;
    }

    function() public payable {}

    function computeDmpBaseHash(bytes32 shelteringInviteId) public view returns (bytes32);
    function getCreationTime(bytes32 shelteringInviteId) public view returns (uint64);

    function getDesignatedShelterer(bytes32 shelteringInviteId) public view returns (address) {
        uint challengeDuration = time.currentTimestamp().sub(getCreationTime(shelteringInviteId));
        uint currentRound = challengeDuration.div(config.ROUND_DURATION());
        bytes32 dmpBaseHash = computeDmpBaseHash(shelteringInviteId);
        uint32 dmpIndex;

        if (currentRound < config.FIRST_PHASE_DURATION().div(config.ROUND_DURATION())) {
            (uint atlasCount, uint32 dmpTier) = getDesignatedSheltererTier(dmpBaseHash);
            dmpIndex = DmpAlgorithm.qualifyShelterer(dmpBaseHash, atlasCount, currentRound);
            return atlasStakeStore.getStakerWithStakeAtIndex(config.ATLAS_STAKE(dmpTier), dmpIndex);
        } else {
            dmpIndex = DmpAlgorithm.qualifyShelterer(dmpBaseHash, atlasStakeStore.getNumberOfStakers(), currentRound);
            return atlasStakeStore.getStakerAtIndex(dmpIndex);
        }
    }

    function getDesignatedSheltererTier(bytes32 dmpBaseHash) private view returns(uint, uint32) {
        uint32 length = config.ATLAS_TIERS_COUNT();
        uint[] memory atlasTiersCounts = new uint[](length);
        uint[] memory atlasRelativeStrengths = new uint[](length);

        for (uint i = 0; i < length; i++) {
            atlasTiersCounts[i] = atlasStakeStore.getNumberOfStakersWithStake(config.ATLAS_STAKE(i));
            atlasRelativeStrengths[i] = config.ATLAS_RELATIVE_STRENGTHS(i);
        }

        uint32 dmpTier = DmpAlgorithm.selectingAtlasTier(dmpBaseHash, atlasTiersCounts, atlasRelativeStrengths);
        uint atlasCount = atlasTiersCounts[dmpTier];

        return (atlasCount, dmpTier);
    }
}
