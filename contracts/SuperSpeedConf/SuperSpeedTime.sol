/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Configuration/Time.sol";


contract SuperSpeedTime is Time {
    uint64 constant public PAYOUT_PERIOD_DURATION = 30 seconds;
    uint64 constant public STORAGE_PERIOD_DURATION = PAYOUT_PERIOD_DURATION * PAYOUT_TO_STORAGE_PERIOD_MULTIPLIER;
}
