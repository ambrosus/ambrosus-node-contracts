/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../Lib/SafeMathExtensions.sol";
import "../Boilerplate/Head.sol";
import "../Configuration/Config.sol";


contract Fees is Base, Ownable {

    using SafeMath for uint;
    using SafeMathExtensions for uint;

    uint constant PENALTY_DIVISOR = 100;

    constructor(Head _head) public Base(_head) {        
    }

    // generally fake implementation made to return anything - TBD in another ticket
    function getFeeForChallenge(uint startTime, uint endTime) public view returns(uint) {
        Config config = context().config();
        uint periods = (endTime.sub(startTime)).div(config.ONE_YEAR());
        return config.BASIC_CHALLANGE_FEE().mul(periods);
    }

    function getPenalty(uint nominalStake, uint penaltiesCount, uint lastPenaltyTime) public view returns(uint penalty, uint newPenaltiesCount) {
        Config config = context().config();
        if ((now - lastPenaltyTime) > config.PENALTY_ESCALATION_TIMEOUT()) {
            return (nominalStake.div(PENALTY_DIVISOR), 1);
        } else {
            return (nominalStake.div(PENALTY_DIVISOR).mul(penaltiesCount.safePow2()), penaltiesCount + 1);
        }
    }
}
