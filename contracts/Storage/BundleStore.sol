/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../Lib/SafeMathExtensions.sol";
import "../Boilerplate/Head.sol";


contract BundleStore is Base {

    using SafeMath for uint;
    using SafeMathExtensions for uint;

    uint constant MAX_EXPIRATION_DATE = 32503680000; // year 3000

    struct Sheltering {
        uint64 shelteringStartDate;
        uint64 shelteringPayoutPeriodsReduction;
        uint totalShelteringReward;
        uint32 index;
    }

    struct Bundle {
        address uploader;
        address[] shelterers;
        mapping(address => Sheltering) shelterings;
        uint64 storagePeriods;
        uint64 uploadTimestamp;
        uint32 uploadBlockNumber;
    }

    event BundleStored(bytes32 bundleId, address uploader);
    event SheltererAdded(bytes32 bundleId, address shelterer);
    event SheltererRemoved(bytes32 bundleId, address shelterer);

    mapping(bytes32 => Bundle) bundles;

    constructor(Head _head) Base(_head) public {}

    function bundleExists(bytes32 bundleId) view public returns (bool) {
        return getStoragePeriodsCount(bundleId) > 0;
    }

    function getUploader(bytes32 bundleId) view public returns (address) {
        return bundles[bundleId].uploader;
    }

    function getUploadTimestamp(bytes32 bundleId) view public returns (uint64) {
        return bundles[bundleId].uploadTimestamp;
    }

    function getUploadBlockNumber(bytes32 bundleId) view public returns (uint) {
        return bundles[bundleId].uploadBlockNumber;
    }

    function getStoragePeriodsCount(bytes32 bundleId) view public returns (uint64) {
        return bundles[bundleId].storagePeriods;
    }

    function getShelterers(bytes32 bundleId) view public returns (address[]) {
        return bundles[bundleId].shelterers;
    }

    function getShelteringStartDate(bytes32 bundleId, address shelterer) view public returns (uint64) {
        return bundles[bundleId].shelterings[shelterer].shelteringStartDate;
    }

    function getTotalShelteringReward(bytes32 bundleId, address shelterer) view public returns (uint) {
        return bundles[bundleId].shelterings[shelterer].totalShelteringReward;
    }

    function getShelteringPayoutPeriodsReduction(bytes32 bundleId, address shelterer) view public returns (uint64) {
        if (getShelteringStartDate(bundleId, shelterer) == 0) {
            return 0;
        }
        return bundles[bundleId].shelterings[shelterer].shelteringPayoutPeriodsReduction;
    }

    function store(bytes32 bundleId, address uploader, uint64 storagePeriods, uint64 currentTimestamp) public onlyContextInternalCalls {
        require(!bundleExists(bundleId));
        require(storagePeriods > 0);

        bundles[bundleId] = Bundle(uploader, new address[](0), storagePeriods, currentTimestamp, block.number.castTo32());
        emit BundleStored(bundleId, uploader);
    }

    function addShelterer(bytes32 bundleId, address shelterer, uint totalReward, uint64 payoutPeriodsReduction, uint64 currentTimestamp)
    public onlyContextInternalCalls
    {
        require(bundleExists(bundleId));
        require(bundles[bundleId].shelterings[shelterer].shelteringStartDate == 0);

        bundles[bundleId].shelterers.push(shelterer);
        bundles[bundleId].shelterings[shelterer] = Sheltering(
            currentTimestamp,
            payoutPeriodsReduction,
            totalReward,
            // solium-disable-next-line indentation
            (bundles[bundleId].shelterers.length - 1).castTo32()
        );
        emit SheltererAdded(bundleId, shelterer);
    }

    function removeSheltererByIndex(bytes32 bundleId, uint32 index) public onlyContextInternalCalls {
        require(bundleExists(bundleId));
        require(bundles[bundleId].shelterers.length > index);

        delete bundles[bundleId].shelterings[bundles[bundleId].shelterers[index]];
        bundles[bundleId].shelterers[index] = bundles[bundleId].shelterers[bundles[bundleId].shelterers.length - 1];
        bundles[bundleId].shelterings[bundles[bundleId].shelterers[index]].index = index;
        delete bundles[bundleId].shelterers[bundles[bundleId].shelterers.length - 1];
        bundles[bundleId].shelterers.length -= 1;
    }

    function removeShelterer(bytes32 bundleId, address shelterer) public onlyContextInternalCalls {
        require(bundleExists(bundleId));
        if (bundles[bundleId].shelterings[shelterer].shelteringStartDate == 0) {
            return;
        }
        removeSheltererByIndex(bundleId, bundles[bundleId].shelterings[shelterer].index);
        emit SheltererRemoved(bundleId, shelterer);
    }
}
