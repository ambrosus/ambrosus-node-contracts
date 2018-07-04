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

    uint constant public PERIOD_DURATION = 28 days;

    function currentTimestamp() public view returns(uint) {
        return now;
    }

    function currentPayoutPeriod() public view returns (uint64) {
        return payoutPeriod(currentTimestamp());
    }

    function payoutPeriod(uint timestamp) public pure returns(uint64) {
        return (uint64)(timestamp.div(PERIOD_DURATION));
    }

    function payoutPeriodStart(uint64 period) public pure returns(uint) {
        return (uint)(period).mul(PERIOD_DURATION);
    }

    function payoutPeriodOffset(uint timestamp) public pure returns(uint) {
        return timestamp.sub(payoutPeriodStart(payoutPeriod(timestamp)));
    }
}
