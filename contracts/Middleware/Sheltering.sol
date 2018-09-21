/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../Boilerplate/Head.sol";
import "../Configuration/Config.sol";
import "../Configuration/Time.sol";
import "../Configuration/Fees.sol";
import "../Storage/BundleStore.sol";
import "../Storage/AtlasStakeStore.sol";
import "../Storage/RolesStore.sol";
import "../Front/Payouts.sol";
import "../Lib/SafeMathExtensions.sol";


contract Sheltering is Base {

    using SafeMath for uint;
    using SafeMath for uint64;
    using SafeMathExtensions for uint;

    constructor(Head _head) public Base(_head) { }

    function() public payable {}

    function storeBundle(bytes32 bundleId, address creator, uint64 storagePeriods) public onlyContextInternalCalls {
        RolesStore rolesStore = context().rolesStore();
        require(rolesStore.getRole(creator) == Consts.NodeType.HERMES);
        BundleStore bundleStore = context().bundleStore();
        Time time = context().time();
        bundleStore.store(bundleId, creator, storagePeriods, time.currentTimestamp());
    }

    function getBundleUploader(bytes32 bundleId) public view returns (address) {
        BundleStore bundleStore = context().bundleStore();
        return bundleStore.getUploader(bundleId);
    }

    function getBundleStoragePeriodsCount(bytes32 bundleId) public view returns (uint64) {
        BundleStore bundleStore = context().bundleStore();
        return bundleStore.getStoragePeriodsCount(bundleId);
    }

    function addShelterer(bytes32 bundleId, address shelterer) public payable onlyContextInternalCalls {
        addSheltererInternal(bundleId, shelterer, msg.value, 0);
    }

    function removeShelterer(bytes32 bundleId, address shelterer, address refundAddress) public onlyContextInternalCalls returns (uint) {
        AtlasStakeStore atlasStakeStore = context().atlasStakeStore();
        BundleStore bundleStore = context().bundleStore();
        Time time = context().time();

        uint64 beginTimestamp = bundleStore.getShelteringStartDate(bundleId, shelterer);
        require(beginTimestamp > 0);

        uint64 storagePeriods = bundleStore.getStoragePeriodsCount(bundleId);
        uint totalReward = bundleStore.getTotalShelteringReward(bundleId, shelterer);

        atlasStakeStore.decrementStorageUsed(shelterer);
        bundleStore.removeShelterer(bundleId, shelterer);

        Payouts payouts = context().payouts();
        uint64 payoutPeriods = storagePeriods.mul(time.PAYOUT_TO_STORAGE_PERIOD_MULTIPLIER()).castTo64();
        uint refundValue = payouts.revokeShelteringReward(shelterer, beginTimestamp, payoutPeriods, totalReward, address(this));

        refundAddress.transfer(refundValue);

        return refundValue;
    }

    function penalizeShelterer(address sheltererId, address refundAddress) public onlyContextInternalCalls returns(uint) {
        AtlasStakeStore atlasStakeStore = context().atlasStakeStore();
        Time time = context().time();
        Fees fees = context().fees();

        (uint penaltiesCount, uint64 lastPenaltyTime) = atlasStakeStore.getPenaltiesHistory(sheltererId);
        uint basicStake = atlasStakeStore.getBasicStake(sheltererId);
        (uint penaltyAmount, uint newPenaltiesCount) = fees.getPenalty(basicStake, penaltiesCount, lastPenaltyTime);
        atlasStakeStore.setPenaltyHistory(sheltererId, newPenaltiesCount, time.currentTimestamp());
        return atlasStakeStore.slash(sheltererId, refundAddress, penaltyAmount);
    }

    function transferSheltering(bytes32 bundleId, address donorId, address recipientId) public onlyContextInternalCalls {
        require(donorId != recipientId);

        Time time = context().time();
        BundleStore bundleStore = context().bundleStore();

        uint64 donorBeginPeriod = time.payoutPeriod(bundleStore.getShelteringStartDate(bundleId, donorId));
        uint64 currentPeriod = time.currentPayoutPeriod();

        uint refund = this.removeShelterer(bundleId, donorId, this);
        addSheltererInternal(bundleId, recipientId, refund, currentPeriod.sub(donorBeginPeriod).castTo64());
    }

    function getShelteringExpirationDate(bytes32 bundleId, address sheltererId) public view returns (uint64) {
        Time time = context().time();
        BundleStore bundleStore = context().bundleStore();

        uint64 startDate = bundleStore.getShelteringStartDate(bundleId, sheltererId);
        if (startDate == 0) {
            return 0;
        }

        uint64 storagePeriods = bundleStore.getStoragePeriodsCount(bundleId);
        uint64 payoutPeriodsReduction = bundleStore.getShelteringPayoutPeriodsReduction(bundleId, sheltererId);

        return startDate
            .add(storagePeriods.mul(time.STORAGE_PERIOD_DURATION()))
            .sub(payoutPeriodsReduction.mul(time.PAYOUT_PERIOD_DURATION()))
            .castTo64();
    }

    function isSheltering(bytes32 bundleId, address sheltererId) public view returns (bool) {
        BundleStore bundleStore = context().bundleStore();
        Time time = context().time();
        address[] memory shelterers = bundleStore.getShelterers(bundleId);
        for (uint i = 0; i < shelterers.length; i++) {
            if (shelterers[i] == sheltererId) {
                return getShelteringExpirationDate(bundleId, sheltererId) > time.currentTimestamp();
            }
        }
        return false;
    }

    function addSheltererInternal(bytes32 bundleId, address shelterer, uint reward, uint64 payoutPeriodReduction) private {
        AtlasStakeStore atlasStakeStore = context().atlasStakeStore();
        BundleStore bundleStore = context().bundleStore();
        Time time = context().time();

        atlasStakeStore.incrementStorageUsed(shelterer);
        bundleStore.addShelterer(bundleId, shelterer, reward, payoutPeriodReduction, time.currentTimestamp());

        uint64 storagePeriods = bundleStore.getStoragePeriodsCount(bundleId);

        Payouts payouts = context().payouts();
        uint64 payoutPeriods = storagePeriods.mul(time.PAYOUT_TO_STORAGE_PERIOD_MULTIPLIER()).sub(payoutPeriodReduction).castTo64();
        payouts.grantShelteringReward.value(reward)(shelterer, payoutPeriods);
    }
}
