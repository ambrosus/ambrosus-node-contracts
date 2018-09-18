/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "../Configuration/Config.sol";
import "../Storage/PayoutsStore.sol";
import "../Configuration/Time.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../Lib/SafeMathExtensions.sol";


contract Payouts is Base {
    using SafeMath for uint;
    using SafeMath for uint64;
    using SafeMathExtensions for uint;

    constructor(Head _head) public Base(_head) {}

    function withdraw() public {
        Time time = context().time();
        PayoutsStore payoutsStore = context().payoutsStore();
        return payoutsStore.withdraw(msg.sender, time.currentPayoutPeriod().sub(1).castTo64());
    }

    function available(uint64 payoutPeriod) public view returns (uint) {
        PayoutsStore payoutsStore = context().payoutsStore();
        return payoutsStore.available(msg.sender, payoutPeriod);
    }

    function grantShelteringReward(address beneficiary, uint64 numberOfPeriods) public payable onlyContextInternalCalls {
        Time time = context().time();
        PayoutsStore payoutsStore = context().payoutsStore();

        (uint rewardRegular, uint rewardBonus) = calculateRewards(numberOfPeriods, msg.value);

        uint64 beginTimestamp = time.currentTimestamp();
        uint64 firstPeriod = time.payoutPeriod(beginTimestamp).add(1).castTo64();
        uint64 lastPeriod = firstPeriod.add(numberOfPeriods).sub(1).castTo64();

        payoutsStore.grantForPeriods.value(rewardRegular.mul(numberOfPeriods))(
            beneficiary,
            firstPeriod,
            lastPeriod
        );

        payoutsStore.grantForPeriods.value(rewardBonus)(
            beneficiary,
            lastPeriod,
            lastPeriod
        );
    }

    function revokeShelteringReward(address beneficiary, uint64 beginTimestamp, uint64 numberOfPeriods, uint amount, address refundAddress)
        public onlyContextInternalCalls returns (uint refund)
    {
        Time time = context().time();
        PayoutsStore payoutsStore = context().payoutsStore();

        (uint rewardRegular, uint rewardBonus) = calculateRewards(numberOfPeriods, amount);

        uint64 firstPeriod = time.payoutPeriod(beginTimestamp).add(1).castTo64();
        uint64 lastPeriod = firstPeriod.add(numberOfPeriods).sub(1).castTo64();

        refund = payoutsStore.revokeForPeriods(
            beneficiary,
            firstPeriod,
            lastPeriod,
            rewardRegular.mul(numberOfPeriods),
            refundAddress
        );

        refund = refund.add(payoutsStore.revokeForPeriods(
            beneficiary,
            lastPeriod,
            lastPeriod,
            rewardBonus,
            refundAddress
        ));

        return refund;
    }

    function calculateRewards(uint64 numberOfPeriods, uint amount)
        private view returns (uint rewardRegular, uint rewardBonus)
    {
        Config config = context().config();

        rewardBonus = amount.mul(config.FINISH_SHELTERING_REWARD_SPLIT()).div(100);
        rewardRegular = amount.sub(rewardBonus).div(numberOfPeriods);
        uint reminder = amount.sub(rewardBonus).sub(rewardRegular.mul(numberOfPeriods));
        rewardBonus = rewardBonus.add(reminder);
    }
}
