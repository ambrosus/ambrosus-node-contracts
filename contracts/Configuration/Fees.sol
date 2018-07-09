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

    uint constant public CHALLANGER_FEE_DIVISOR = 2;
    uint constant public VALIDATOR_FEE_MULTIPLIER = 45;
    uint constant public VALIDATOR_FEE_DIVISOR = 100;
    uint constant public UPLOAD_FEE_MULTIPLIER = 10;
    
    constructor(Head _head) public Base(_head) {        
    }
    
    function getFeeForUpload(uint units) public view returns(uint) {
        require(units > 0);
        Config config = context().config();
        return config.BASIC_CHALLANGE_FEE().mul(units).mul(UPLOAD_FEE_MULTIPLIER);
    }

    function getFeeForChallenge(uint startTime, uint endTime) public view returns (uint) {
        uint interval = endTime.sub(startTime);
        require(interval > 0);
        
        Config config = context().config();        
        uint unit = config.STORAGE_PERIOD_UNIT();        
        require(interval.mod(unit) == 0);

        uint units = interval.div(unit);
        return getFeeForUpload(units).div(UPLOAD_FEE_MULTIPLIER);
    }

    function calculateFeeSplit(uint value) public pure returns (uint challengeFee, uint validatorsFee, uint burnFee) {
        challengeFee = value.div(CHALLANGER_FEE_DIVISOR);
        validatorsFee = value.mul(VALIDATOR_FEE_MULTIPLIER).div(VALIDATOR_FEE_DIVISOR);
        burnFee = value.sub(validatorsFee).sub(challengeFee);
    }

    function getPenalty(uint nominalStake, uint penaltiesCount, uint lastPenaltyTime) public view returns(uint penalty, uint newPenaltiesCount) {
        Config config = context().config();
        if ((now - lastPenaltyTime) > config.PENALTY_ESCALATION_TIMEOUT()) {
            return (nominalStake.div(config.PENALTY_DIVISOR()), 1);
        } else {
            return (nominalStake.div(config.PENALTY_DIVISOR()).mul(penaltiesCount.safePow2()), penaltiesCount + 1);
        }
    }
}
