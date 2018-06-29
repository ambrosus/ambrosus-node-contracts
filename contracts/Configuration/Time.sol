/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Time {
    using SafeMath for uint;

    function currentTimestamp() public view returns(uint) {
        return now;
    }

    function currentPayoutPeriod() public view returns (uint64) {
        return payoutPeriodForTimestamp(currentTimestamp());
    }

    function payoutPeriodForTimestamp(uint timestamp) public pure returns(uint64) {
        return (uint64)(timestamp.div(28 days));
    }

    function timestampForBeginOfPayoutPeriod(uint64 period) public pure returns(uint) {
        return (uint)(period).mul(28 days);
    }

    function secondsSinceBeginOfPayoutPeriod(uint timestamp) public pure returns(uint) {
        return timestamp.sub(timestampForBeginOfPayoutPeriod(payoutPeriodForTimestamp(timestamp)));
    }
}
