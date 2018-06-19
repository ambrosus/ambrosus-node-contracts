/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


contract Fees is Ownable {

    using SafeMath for uint;


    uint constant UNIT = 10**18;
    uint constant ONE_YEAR_IN_SECONDS = 31536000;

    uint basicChallengeFee = 1;

    // generally fake implementation made to return anything - TBD in another ticket
    function getFeeForChallenge(uint startTime, uint endTime) public view returns(uint) {
        uint periods = (endTime.sub(startTime)).div(ONE_YEAR_IN_SECONDS);
        return basicChallengeFee * periods * UNIT;
    }
}
