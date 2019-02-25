/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../Lib/SafeMathExtensions.sol";


contract Time {
    using SafeMath for uint64;
    using SafeMathExtensions for uint;

    uint64 constant public PAYOUT_PERIOD_DURATION = 28 days;
    uint64 constant public PAYOUT_TO_STORAGE_PERIOD_MULTIPLIER = 13;
    uint64 constant public STORAGE_PERIOD_DURATION = PAYOUT_PERIOD_DURATION * PAYOUT_TO_STORAGE_PERIOD_MULTIPLIER;

    function currentTimestamp() public view returns(uint64) {
        return now.castTo64();
    }

    function currentPayoutPeriod() public view returns (uint64) {
        return payoutPeriod(currentTimestamp());
    }

    function payoutPeriod(uint64 timestamp) public pure returns(uint64) {
        return timestamp.div(PAYOUT_PERIOD_DURATION).castTo64();
    }

    function payoutPeriodStart(uint64 period) public pure returns(uint64) {
        return period.mul(PAYOUT_PERIOD_DURATION).castTo64();
    }

    function payoutPeriodOffset(uint64 timestamp) public pure returns(uint64) {
        return timestamp.sub(payoutPeriodStart(payoutPeriod(timestamp))).castTo64();
    }
}
