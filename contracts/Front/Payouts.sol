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

        uint64 beginTimestamp = time.currentTimestamp();

        (uint rewardAtEnd, uint rewardInFullPeriod, uint rewardUnaligned, uint rewardInFirstPeriod) = calculateRewards(
            beginTimestamp,
            numberOfPeriods,
            msg.value);

        uint64 firstPeriod = time.payoutPeriod(beginTimestamp);

        grantForFirstPeriod(payoutsStore, beneficiary, firstPeriod, rewardInFirstPeriod);
        grantForMiddlePeriods(payoutsStore, beneficiary, firstPeriod, numberOfPeriods, rewardInFullPeriod);
        grantForLastPeriod(payoutsStore, beneficiary, firstPeriod, numberOfPeriods, rewardAtEnd, rewardUnaligned, rewardInFirstPeriod);
    }

    function revokeShelteringReward(address beneficiary, uint64 beginTimestamp, uint64 numberOfPeriods, uint amount, address refundAddress)
    public onlyContextInternalCalls
    {
        Time time = context().time();
        PayoutsStore payoutsStore = context().payoutsStore();

        (uint rewardAtEnd, uint rewardInFullPeriod, uint rewardUnaligned, uint rewardInFirstPeriod) = calculateRewards(beginTimestamp, numberOfPeriods, amount);

        uint64 firstPeriod = time.payoutPeriod(beginTimestamp);

        revokeFirstPeriod(payoutsStore, beneficiary, firstPeriod, rewardInFirstPeriod, refundAddress);
        revokeMiddlePeriods(payoutsStore, beneficiary, firstPeriod, numberOfPeriods, rewardInFullPeriod, refundAddress);
        revokeWhatsLeft(payoutsStore, beneficiary, firstPeriod, numberOfPeriods, rewardAtEnd, rewardUnaligned, rewardInFirstPeriod, refundAddress);

    }

    function transferShelteringReward(address donor, address recipient, uint beginTimestamp, uint64 numberOfPeriods, uint amount) public {
        // TODO Unimplemented
    }

    function calculateRewards(uint64 beginTimestamp, uint64 numberOfPeriods, uint amount)
    private view returns (uint rewardAtEnd, uint rewardInFullPeriod, uint rewardUnaligned, uint rewardInFirstPeriod)
    {
        Time time = context().time();
        Config config = context().config();

        rewardAtEnd = amount.mul(config.FINISH_SHELTERING_REWARD_SPLIT()).div(100);
        rewardInFullPeriod = amount.sub(rewardAtEnd).div(numberOfPeriods);
        rewardUnaligned = amount.sub(rewardAtEnd).sub(rewardInFullPeriod.mul(numberOfPeriods.sub(1)));
        rewardInFirstPeriod = rewardUnaligned
            .mul(time.PAYOUT_PERIOD_DURATION().sub(time.payoutPeriodOffset(beginTimestamp)))
            .div(time.PAYOUT_PERIOD_DURATION());
    }

    /*
        ⬇⬇⬇ Helpers necessary due to the EVM stack size limit ⬇⬇⬇
    */

    function grantForFirstPeriod(PayoutsStore payoutsStore, address beneficiary, uint64 firstPeriod, uint rewardInFirstPeriod) private {
        payoutsStore.grantForPeriods.value(rewardInFirstPeriod)(
            beneficiary,
            firstPeriod,
            firstPeriod);
    }

    function grantForMiddlePeriods(PayoutsStore payoutsStore, address beneficiary, uint64 firstPeriod, uint64 numberOfPeriods, uint rewardInFullPeriod)
        private
    {
        payoutsStore.grantForPeriods.value(numberOfPeriods.sub(1).mul(rewardInFullPeriod))(
            beneficiary,
            firstPeriod.add(1).castTo64(),
            firstPeriod.add(numberOfPeriods).sub(1).castTo64());
    }

    function grantForLastPeriod(
        PayoutsStore payoutsStore, address beneficiary, uint64 firstPeriod, uint64 numberOfPeriods, uint rewardAtEnd, uint rewardUnaligned, uint rewardInFirstPeriod)
        private
    {
        if (rewardUnaligned.sub(rewardInFirstPeriod) == 0) {
            payoutsStore.grantForPeriods.value(rewardAtEnd)(
                beneficiary,
                firstPeriod.add(numberOfPeriods).sub(1).castTo64(),
                firstPeriod.add(numberOfPeriods).sub(1).castTo64());
        } else {
            payoutsStore.grantForPeriods.value(rewardUnaligned.sub(rewardInFirstPeriod).add(rewardAtEnd))(
                beneficiary,
                firstPeriod.add(numberOfPeriods).castTo64(),
                firstPeriod.add(numberOfPeriods).castTo64());
        }
    }

    function revokeFirstPeriod(PayoutsStore payoutsStore, address beneficiary, uint64 firstPeriod, uint rewardInFirstPeriod, address refundAddress)
        private
    {
        payoutsStore.revokeForPeriods(
            beneficiary,
            firstPeriod,
            firstPeriod,
            rewardInFirstPeriod,
            refundAddress);
    }

    function revokeMiddlePeriods(
        PayoutsStore payoutsStore, address beneficiary, uint64 firstPeriod, uint64 numberOfPeriods, uint rewardInFullPeriod, address refundAddress)
        private
    {
        payoutsStore.revokeForPeriods(
            beneficiary,
            firstPeriod.add(1).castTo64(),
            firstPeriod.add(numberOfPeriods).sub(1).castTo64(),
            numberOfPeriods.sub(1).mul(rewardInFullPeriod).castTo64(),
            refundAddress);
    }

    function revokeWhatsLeft(
        PayoutsStore payoutsStore, address beneficiary, uint64 firstPeriod, uint64 numberOfPeriods, uint rewardAtEnd, uint rewardUnaligned, uint rewardInFirstPeriod, address refundAddress)
        private
    {
        if (rewardUnaligned.sub(rewardInFirstPeriod) == 0) {
            payoutsStore.revokeForPeriods(
                beneficiary,
                firstPeriod.add(numberOfPeriods).sub(1).castTo64(),
                firstPeriod.add(numberOfPeriods).sub(1).castTo64(),
                rewardAtEnd,
                refundAddress);
        } else {
            payoutsStore.revokeForPeriods(
                beneficiary,
                firstPeriod.add(numberOfPeriods).castTo64(),
                firstPeriod.add(numberOfPeriods).castTo64(),
                rewardUnaligned.add(rewardAtEnd).sub(rewardInFirstPeriod),
                refundAddress);
        }
    }
}
