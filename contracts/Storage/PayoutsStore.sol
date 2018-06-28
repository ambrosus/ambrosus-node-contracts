/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";

contract PayoutsStore is Base {
    struct GrantPeriodChange {
        uint increase;
        uint decrease;
    }

    mapping(address => mapping(uint => GrantPeriodChange)) public grantPeriodChanges;
    mapping(address => mapping(bytes32 => uint)) public grantSums;
    mapping(address => uint64) public nextWithdrawPeriod;

    constructor(Head _head) public Base(_head) { }

    function withdraw(address beneficiaryId, uint64 toPeriod) public onlyContextInternalCalls {
        uint amount = 0;
        for (uint64 period = nextWithdrawPeriod[beneficiaryId]; period <= toPeriod; ++period) {
            amount += available(beneficiaryId, period);
        }
        nextWithdrawPeriod[beneficiaryId] = toPeriod + 1;

        beneficiaryId.transfer(amount);
    }

    function available(address beneficiaryId, uint64 period) public view onlyContextInternalCalls returns(uint) {
        if (period < nextWithdrawPeriod[beneficiaryId]) {
            return 0;
        }

        uint accum = 0;
        for (uint i = 0; i<=period; ++i) {
            GrantPeriodChange storage grant = grantPeriodChanges[beneficiaryId][i];
            accum += grant.increase;
            if (i == period) {
                return accum;
            }
            accum -= grant.decrease; 
        }
    }

    function grantRepeating(address beneficiaryId, uint64 periodStart, uint64 periodEnd) public payable onlyContextInternalCalls {
        require(periodEnd>=periodStart);

        uint amountPerPeriod = calculateAmountPerPeriod(periodStart, periodEnd, msg.value);

        bytes32 periodId = calculatePeriodHash(periodStart, periodEnd);
        grantSums[beneficiaryId][periodId] += msg.value;

        GrantPeriodChange storage grantChangeBegin = grantPeriodChanges[beneficiaryId][periodStart];
        grantChangeBegin.increase += amountPerPeriod;

        GrantPeriodChange storage grantChangeEnd = grantPeriodChanges[beneficiaryId][periodEnd];
        grantChangeEnd.decrease += amountPerPeriod;
    }

    function revokeRepeating(address beneficiaryId, uint64 periodStart, uint64 periodEnd, uint amount, address refundAddress) public onlyContextInternalCalls {
        require(periodEnd>=periodStart);

        uint amountPerPeriod = calculateAmountPerPeriod(periodStart, periodEnd, amount);

        bytes32 periodId = calculatePeriodHash(periodStart, periodEnd);
        require(grantSums[beneficiaryId][periodId] >= amount);
        grantSums[beneficiaryId][periodId] -= amount;

        GrantPeriodChange storage grantChangeBegin = grantPeriodChanges[beneficiaryId][periodStart];
        grantChangeBegin.increase -= amountPerPeriod;

        GrantPeriodChange storage grantChangeEnd = grantPeriodChanges[beneficiaryId][periodEnd];
        grantChangeEnd.decrease -= amountPerPeriod;

        refundAddress.transfer(amount);
    }

    function calculatePeriodHash(uint64 periodStart, uint64 periodEnd) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(periodStart, periodEnd));
    }

    function calculateAmountPerPeriod(uint64 periodStart, uint64 periodEnd, uint amount) public pure returns (uint) {
        uint periodCount = periodEnd - periodStart + 1;
        require(amount % periodCount == 0);

        return amount / periodCount;
    }
}
