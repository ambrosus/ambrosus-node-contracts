/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../Lib/SafeMath2.sol";


contract Fees is Ownable {

    using SafeMath for uint;
    using SafeMath2 for uint;

    uint constant UNIT = 10**18;
    uint constant ONE_YEAR_IN_SECONDS = 31536000;

    uint constant PENALTY_DIVISOR = 100;
    uint constant PENALTY_ESCALATION_TIMEOUT = 90 days;
    uint constant BASIC_FEE_CHALLANGE = 1;

    // generally fake implementation made to return anything - TBD in another ticket
    function getFeeForChallenge(uint startTime, uint endTime) public pure returns(uint) {
        uint periods = (endTime.sub(startTime)).div(ONE_YEAR_IN_SECONDS);
        return BASIC_FEE_CHALLANGE.mul(periods).mul(UNIT);
    }

    function getPenalty(uint nominalStake, uint panaltiesCount, uint lastPenaltyTime) public view returns(uint, uint) {
        if ((now - lastPenaltyTime) > PENALTY_ESCALATION_TIMEOUT) {
            return (nominalStake.div(PENALTY_DIVISOR), 0);
        } else {
            return (nominalStake.div(PENALTY_DIVISOR).mul(panaltiesCount.safePow2()), panaltiesCount + 1);
        }
    }
}
