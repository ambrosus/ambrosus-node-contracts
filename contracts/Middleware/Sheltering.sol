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
        require(rolesStore.getRole(creator) == Config.NodeType.HERMES);
        BundleStore bundleStore = context().bundleStore();
        bundleStore.store(bundleId, creator, storagePeriods);
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
        AtlasStakeStore atlasStakeStore = context().atlasStakeStore();
        BundleStore bundleStore = context().bundleStore();

        atlasStakeStore.incrementStorageUsed(shelterer);
        bundleStore.addShelterer(bundleId, shelterer, msg.value);

        uint64 storagePeriods = bundleStore.getStoragePeriodsCount(bundleId);

        Payouts payouts = context().payouts();
        uint64 payoutPeriods = storagePeriods.mul(13).castTo64();
        payouts.grantShelteringReward.value(msg.value)(shelterer, payoutPeriods);
    }

    function removeShelterer(bytes32 bundleId, address shelterer, address refundAddress) public onlyContextInternalCalls returns (uint) {
        AtlasStakeStore atlasStakeStore = context().atlasStakeStore();
        BundleStore bundleStore = context().bundleStore();

        uint64 beginTimestamp = bundleStore.getShelteringStartDate(bundleId, shelterer);
        uint64 storagePeriods = bundleStore.getStoragePeriodsCount(bundleId);
        uint totalReward = bundleStore.getTotalShelteringReward(bundleId, shelterer);

        atlasStakeStore.decrementStorageUsed(shelterer);
        bundleStore.removeShelterer(bundleId, shelterer);

        Payouts payouts = context().payouts();
        uint64 payoutPeriods = storagePeriods.mul(13).castTo64();
        uint refundValue = payouts.revokeShelteringReward(shelterer, beginTimestamp, payoutPeriods, totalReward, address(this));

        refundAddress.transfer(refundValue);

        return refundValue;
    }

    function getShelteringExpirationDate(bytes32 bundleId, address sheltererId) public view returns (uint) {
        BundleStore bundleStore = context().bundleStore();
        return bundleStore.getShelteringExpirationDate(bundleId, sheltererId);
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
}
