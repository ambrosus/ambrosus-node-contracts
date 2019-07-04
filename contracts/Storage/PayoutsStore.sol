/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "openzeppelin-solidity/contracts/math/Math.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../Lib/SafeMathExtensions.sol";


contract PayoutsStore is Base {

    using SafeMath for uint;
    using SafeMath for uint64;
    using SafeMathExtensions for uint;

    struct GrantPeriodChange {
        uint increase;
        uint decrease;
    }

    mapping(address => mapping(uint => GrantPeriodChange)) private grantPeriodChanges;
    mapping(address => mapping(bytes32 => uint)) private grantSums;
    mapping(address => uint64) private nextWithdrawPeriod;

    constructor(Head _head) public Base(_head) { }

    function withdraw(address beneficiaryId, address targetId, uint64 toPeriod) public onlyContextInternalCalls returns(uint) {
        uint payoutSum = 0;
        uint accumulator = 0;
        for (uint period = 0; period <= toPeriod; ++period) {
            GrantPeriodChange storage grant = grantPeriodChanges[beneficiaryId][period];
            accumulator = accumulator.add(grant.increase);
            if (period >= nextWithdrawPeriod[beneficiaryId]) {
                payoutSum = payoutSum.add(accumulator);
            }
            accumulator = accumulator.sub(grant.decrease);
        }
        nextWithdrawPeriod[beneficiaryId] = toPeriod.add(1).castTo64();

        targetId.transfer(payoutSum);
        return payoutSum;
    }

    function available(address beneficiaryId, uint64 payoutPeriod) public view onlyContextInternalCalls returns(uint) {
        if (payoutPeriod < nextWithdrawPeriod[beneficiaryId]) {
            return 0;
        }

        uint accumulator = 0;
        for (uint i = 0; i <= payoutPeriod; ++i) {
            GrantPeriodChange storage grant = grantPeriodChanges[beneficiaryId][i];
            accumulator = accumulator.add(grant.increase);
            if (i == payoutPeriod) {
                return accumulator;
            }
            accumulator = accumulator.sub(grant.decrease);
        }
    }

    function grantForPeriods(address beneficiaryId, uint64 firstPeriod, uint64 lastPeriod) public payable onlyContextInternalCalls {
        require(lastPeriod >= firstPeriod);

        uint payoutPerPeriod = calculatePayoutPerPeriod(firstPeriod, lastPeriod, msg.value);

        bytes32 periodId = calculatePeriodHash(firstPeriod, lastPeriod);
        grantSums[beneficiaryId][periodId] = grantSums[beneficiaryId][periodId].add(msg.value);

        GrantPeriodChange storage grantChangeBegin = grantPeriodChanges[beneficiaryId][firstPeriod];
        grantChangeBegin.increase = grantChangeBegin.increase.add(payoutPerPeriod);

        GrantPeriodChange storage grantChangeEnd = grantPeriodChanges[beneficiaryId][lastPeriod];
        grantChangeEnd.decrease = grantChangeEnd.decrease.add(payoutPerPeriod);
    }

    function revokeForPeriods(address beneficiaryId, uint64 firstPeriod, uint64 lastPeriod, uint totalPayout, address refundAddress)
        public onlyContextInternalCalls returns (uint refund)
    {
        require(lastPeriod >= firstPeriod);

        uint payoutPerPeriod = calculatePayoutPerPeriod(firstPeriod, lastPeriod, totalPayout);

        bytes32 periodId = calculatePeriodHash(firstPeriod, lastPeriod);
        require(grantSums[beneficiaryId][periodId] >= totalPayout);
        grantSums[beneficiaryId][periodId] = grantSums[beneficiaryId][periodId].sub(totalPayout);

        GrantPeriodChange storage grantChangeBegin = grantPeriodChanges[beneficiaryId][firstPeriod];
        grantChangeBegin.increase = grantChangeBegin.increase.sub(payoutPerPeriod);

        GrantPeriodChange storage grantChangeEnd = grantPeriodChanges[beneficiaryId][lastPeriod];
        grantChangeEnd.decrease = grantChangeEnd.decrease.sub(payoutPerPeriod);

        refund = payoutPerPeriod.mul(calculateNumberOfPeriodsToRefund(nextWithdrawPeriod[beneficiaryId], firstPeriod, lastPeriod));
        refundAddress.transfer(refund);
    }

    function calculatePeriodHash(uint64 firstPeriod, uint64 lastPeriod) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(firstPeriod, lastPeriod));
    }

    function calculatePayoutPerPeriod(uint64 firstPeriod, uint64 lastPeriod, uint totalPayout) private pure returns (uint) {
        uint periodCount = lastPeriod.sub(firstPeriod).add(1);
        require(totalPayout.mod(periodCount) == 0);

        return totalPayout.div(periodCount);
    }

    function calculateNumberOfPeriodsToRefund(uint64 _nextWithdrawPeriod, uint64 _firstPeriod, uint64 _lastPeriod) private pure returns (uint) {
        require(_lastPeriod >= _firstPeriod);

        uint64 lowPeriod = Math.max64(_firstPeriod, _nextWithdrawPeriod);

        if (_lastPeriod >= lowPeriod) {
            return _lastPeriod.sub(lowPeriod).add(1);
        } else {
            return 0;
        }
    }
}
