/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;


contract Config {
    uint constant public CHALLENGE_DURATION = 3 days;
    uint constant public STORAGE_PERIOD_UNIT = 364 days;
    uint constant public PENALTY_ESCALATION_TIMEOUT = 90 days;
    uint constant public FINISH_SHELTERING_REWARD_SPLIT = 20;
    uint constant public PENALTY_DIVIDER = 100;
    address constant public BURN_ADDRESS = 0x1000000000000000000000000000000000000000;
}
