/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;


contract Config {
    uint constant public CHALLENGE_DURATION = 3 days;
    uint constant public PENALTY_ESCALATION_TIMEOUT = 90 days;
    uint constant public FINISH_SHELTERING_REWARD_SPLIT = 22;
    uint constant public PENALTY_DIVIDER = 100;
    uint constant public BUNDLE_SIZE_LIMIT = 16384;

    uint constant public APOLLO_DEPOSIT = 250000 ether;

    uint[3] public ATLAS_STAKE = [10000 ether, 30000 ether, 75000 ether];
    uint[3] public ATLAS_RELATIVE_STRENGTHS = [1, 4, 12];
    uint32 constant public ATLAS_TIERS_COUNT = 3;

    uint constant public SHELTERING_CAP_ATLASES_PERCENTAGE = 80;
    uint constant public SHELTERING_CAP_ATLAS_NUMBER_THRESHOLD = 8;

    uint64 constant public ROUND_DURATION = 5 minutes;
    uint64 constant public FIRST_PHASE_DURATION = 2 hours;
}
