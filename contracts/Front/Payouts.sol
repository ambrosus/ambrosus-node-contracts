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


contract Payouts is Base {
    constructor(Head _head) public Base(_head) { }

    function withdraw() public {
        Time time = context().time();
        PayoutsStore payoutsStore = context().payoutsStore();
        return payoutsStore.withdraw(msg.sender, time.currentPayoutPeriod() - 1);
    }

    function available(uint64 period) public view returns (uint) {
        PayoutsStore payoutsStore = context().payoutsStore();
        return payoutsStore.available(msg.sender, period);
    }

    function grantShelteringReward(address beneficiary, uint64 numberOfPeriods) public payable onlyContextInternalCalls {
        Time time = context().time();
        PayoutsStore payoutsStore = context().payoutsStore();

        uint beginTimestamp = time.currentTimestamp();

        (uint rewardAtEnd, uint rewardInFullPeriod, uint rewardUnaligned, uint rewardInFirstPeriod) = calculateRewards(
            beginTimestamp, 
            numberOfPeriods,
            msg.value);
        
        uint64 firstPeriod = time.payoutPeriod(beginTimestamp);

        payoutsStore.grantForPeriods.value(rewardInFirstPeriod)(
            beneficiary,
            firstPeriod,
            firstPeriod);
        payoutsStore.grantForPeriods.value(rewardInFullPeriod * (numberOfPeriods - 1))(
            beneficiary,
            firstPeriod + 1,
            firstPeriod + numberOfPeriods - 1);
        if (rewardUnaligned - rewardInFirstPeriod == 0) {
            payoutsStore.grantForPeriods.value(rewardAtEnd)(
                beneficiary,
                firstPeriod + numberOfPeriods - 1,
                firstPeriod + numberOfPeriods - 1);
        } else {
            payoutsStore.grantForPeriods.value(rewardUnaligned - rewardInFirstPeriod + rewardAtEnd)(
                beneficiary,
                firstPeriod + numberOfPeriods,
                firstPeriod + numberOfPeriods);
        }
    }
     
    function revokeShelteringReward(address beneficiary, uint beginTimestamp, uint64 numberOfPeriods, uint amount, address refundAddress) 
        public onlyContextInternalCalls 
    {
        Time time = context().time();
        PayoutsStore payoutsStore = context().payoutsStore();

        (uint rewardAtEnd, uint rewardInFullPeriod, uint rewardUnaligned, uint rewardInFirstPeriod) = calculateRewards(beginTimestamp, numberOfPeriods, amount);

        uint64 firstPeriod = time.payoutPeriod(beginTimestamp);

        payoutsStore.revokeForPeriods(
            beneficiary,
            firstPeriod,
            firstPeriod,
            rewardInFirstPeriod,
            refundAddress);
        payoutsStore.revokeForPeriods(
            beneficiary,
            firstPeriod + 1,
            firstPeriod + numberOfPeriods - 1,
            rewardInFullPeriod * (numberOfPeriods - 1),
            refundAddress);

        if (rewardUnaligned - rewardInFirstPeriod == 0) {
            payoutsStore.revokeForPeriods(
                beneficiary,
                firstPeriod + numberOfPeriods - 1,
                firstPeriod + numberOfPeriods - 1,
                rewardAtEnd,
                refundAddress);
        } else {
            payoutsStore.revokeForPeriods(
                beneficiary,
                firstPeriod + numberOfPeriods,
                firstPeriod + numberOfPeriods,
                rewardUnaligned - rewardInFirstPeriod + rewardAtEnd,
                refundAddress);
        }
    }

    function calculateRewards(uint beginTimestamp, uint64 numberOfPeriods, uint amount) 
        private view returns (uint rewardAtEnd, uint rewardInFullPeriod, uint rewardUnaligned,  uint rewardInFirstPeriod) 
    {
        Time time = context().time();
        Config config = context().config();

        rewardAtEnd = amount * config.FINISH_SHELTERING_REWARD_SPLIT() / 100;
        rewardInFullPeriod = (amount - rewardAtEnd) / numberOfPeriods;
        rewardUnaligned = amount - rewardAtEnd - rewardInFullPeriod * (numberOfPeriods - 1);
        rewardInFirstPeriod = rewardUnaligned * (time.PERIOD_DURATION() - time.payoutPeriodOffset(beginTimestamp)) / time.PERIOD_DURATION();
    }
}
