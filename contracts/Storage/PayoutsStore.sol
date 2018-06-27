/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "openzeppelin-solidity/contracts/math/Math.sol";


contract PayoutsStore is Base {
    struct GrantPeriodChange {
        uint increase;
        uint decrease;
    }

    mapping(address => mapping(uint => GrantPeriodChange)) private grantPeriodChanges;
    mapping(address => mapping(bytes32 => uint)) private grantSums;
    mapping(address => uint64) private nextWithdrawPeriod;

    constructor(Head _head) public Base(_head) { }

    function withdraw(address beneficiaryId, uint64 toPeriod) public onlyContextInternalCalls {
        uint payoutSum = 0;
        uint accumulator = 0;
        for (uint period = 0; period <= toPeriod; ++period) {
            GrantPeriodChange storage grant = grantPeriodChanges[beneficiaryId][period];
            accumulator += grant.increase;
            if (period >= nextWithdrawPeriod[beneficiaryId]) {
                payoutSum += accumulator;
            }
            accumulator -= grant.decrease; 
        }
        nextWithdrawPeriod[beneficiaryId] = toPeriod + 1;

        beneficiaryId.transfer(payoutSum);
    }

    function available(address beneficiaryId, uint64 period) public view onlyContextInternalCalls returns(uint) {
        if (period < nextWithdrawPeriod[beneficiaryId]) {
            return 0;
        }

        uint accumulator = 0;
        for (uint i = 0; i <= period; ++i) {
            GrantPeriodChange storage grant = grantPeriodChanges[beneficiaryId][i];
            accumulator += grant.increase;
            if (i == period) {
                return accumulator;
            }
            accumulator -= grant.decrease; 
        }
    }

    function grantForPeriods(address beneficiaryId, uint64 firstPeriod, uint64 lastPeriod) public payable onlyContextInternalCalls {
        require(lastPeriod >= firstPeriod);

        uint payoutPerPeriod = calculatePayoutPerPeriod(firstPeriod, lastPeriod, msg.value);

        bytes32 periodId = calculatePeriodHash(firstPeriod, lastPeriod);
        grantSums[beneficiaryId][periodId] += msg.value;

        GrantPeriodChange storage grantChangeBegin = grantPeriodChanges[beneficiaryId][firstPeriod];
        grantChangeBegin.increase += payoutPerPeriod;

        GrantPeriodChange storage grantChangeEnd = grantPeriodChanges[beneficiaryId][lastPeriod];
        grantChangeEnd.decrease += payoutPerPeriod;
    }

    function revokeForPeriods(address beneficiaryId, uint64 firstPeriod, uint64 lastPeriod, uint totalPayout, address refundAddress) 
        public onlyContextInternalCalls 
    {
        require(lastPeriod >= firstPeriod);

        uint payoutPerPeriod = calculatePayoutPerPeriod(firstPeriod, lastPeriod, totalPayout);

        bytes32 periodId = calculatePeriodHash(firstPeriod, lastPeriod);
        require(grantSums[beneficiaryId][periodId] >= totalPayout);
        grantSums[beneficiaryId][periodId] -= totalPayout;

        GrantPeriodChange storage grantChangeBegin = grantPeriodChanges[beneficiaryId][firstPeriod];
        grantChangeBegin.increase -= payoutPerPeriod;

        GrantPeriodChange storage grantChangeEnd = grantPeriodChanges[beneficiaryId][lastPeriod];
        grantChangeEnd.decrease -= payoutPerPeriod;

        refundAddress.transfer(payoutPerPeriod * calculateNumberOfPeriodsToRefund(nextWithdrawPeriod[beneficiaryId], firstPeriod, lastPeriod));
    }

    function calculatePeriodHash(uint64 firstPeriod, uint64 lastPeriod) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(firstPeriod, lastPeriod));
    }

    function calculatePayoutPerPeriod(uint64 firstPeriod, uint64 lastPeriod, uint totalPayout) private pure returns (uint) {
        uint periodCount = lastPeriod - firstPeriod + 1;
        require(totalPayout % periodCount == 0);

        return totalPayout / periodCount;
    }

    function calculateNumberOfPeriodsToRefund(uint64 _nextWithdrawPeriod, uint64 _firstPeriod, uint64 _lastPeriod) private pure returns (uint) {
        require(_lastPeriod >= _firstPeriod);

        uint64 lowPeriod = Math.max64(_firstPeriod, _nextWithdrawPeriod);
        
        if (_lastPeriod >= lowPeriod) {
            return _lastPeriod - lowPeriod + 1;
        } else {
            return 0;
        }
    }
}
