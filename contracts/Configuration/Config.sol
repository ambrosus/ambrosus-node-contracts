/*
Copyright: Ambrosus Technologies GmbH
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
    uint32 constant public COOLDOWN_SWITCH_THRESHOLD = 50;
    uint32 constant public COOLDOWN_LOW_REDUCTION = 4;
    uint32 constant public COOLDOWN_HIGH_PERCENTAGE = 90;

    uint32 constant public COOLDOWN_AVAILABLE_TARGET_PERCENT = 90;

    uint32 constant public COOLDOWN_TIMEOUT = 1 days;

    uint constant public APOLLO_DEPOSIT = 250000 ether;
    uint constant public ATLAS1_STAKE = 10000 ether;
    uint constant public ATLAS2_STAKE = 30000 ether;
    uint constant public ATLAS3_STAKE = 75000 ether;

    uint constant public ATLAS1_STORAGE_LIMIT = 100000;
    uint constant public ATLAS2_STORAGE_LIMIT = 400000;
    uint constant public ATLAS3_STORAGE_LIMIT = 1000000;

    uint constant public SHELTERING_CAP_ATLASES_PERCENTAGE = 80;
    uint constant public SHELTERING_CAP_ATLAS_NUMBER_THRESHOLD = 8;
}
