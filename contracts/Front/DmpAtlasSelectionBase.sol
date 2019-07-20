/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Configuration/Config.sol";
import "../Lib/DmpAlgorithm.sol";
import "../Boilerplate/Head.sol";
import "../Storage/AtlasStakeStore.sol";


contract DmpAtlasSelectionBase is Base {

    AtlasStakeStore internal atlasStakeStore;
    Config internal config;

    constructor(Head _head, AtlasStakeStore _atlasStakeStore, Config _config)
    internal Base(_head)
    {
        atlasStakeStore = _atlasStakeStore;
        config = _config;
    }

    function() public payable {}

    function getDesignatedSheltererTier(bytes32 dmpBaseHash) internal view returns(uint, uint32) {
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
