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


contract Sheltering is Base {

    using SafeMath for uint;

    constructor(Head _head) public Base(_head) { }

    function store(bytes32 bundleId, address creator, uint64 storagePeriods) public onlyContextInternalCalls {
        RolesStore rolesStore = context().rolesStore();
        require(rolesStore.getRole(creator) == Config.NodeType.HERMES);
        BundleStore bundleStore = context().bundleStore();
        bundleStore.store(bundleId, creator, storagePeriods);
    }

    function getShelteringData(bytes32 bundleId, address shelterer) public view onlyContextInternalCalls
    returns (uint startingDate, uint64 storagePeriods, uint totalReward)
    {
        BundleStore bundleStore = context().bundleStore();
        return (
            bundleStore.getShelteringStartDate(bundleId, shelterer),
            bundleStore.getStoragePeriodsCount(bundleId),
            bundleStore.getTotalShelteringReward(bundleId, shelterer)
        );
    }

    function addShelterer(bytes32 bundleId, address shelterer, uint amount) public onlyContextInternalCalls {
        AtlasStakeStore atlasStakeStore = context().atlasStakeStore();
        BundleStore bundleStore = context().bundleStore();

        atlasStakeStore.incrementStorageUsed(shelterer);
        bundleStore.addShelterer(bundleId, shelterer, amount);
    }

    function removeShelterer(bytes32 bundleId, address shelterer) public onlyContextInternalCalls {              
        AtlasStakeStore atlasStakeStore = context().atlasStakeStore();
        BundleStore bundleStore = context().bundleStore();

        atlasStakeStore.decrementStorageUsed(shelterer);
        bundleStore.removeShelterer(bundleId, shelterer);
    }

    function isSheltering(bytes32 bundleId, address sheltererId) public view returns(bool) {
        BundleStore bundleStore = context().bundleStore();
        Time time = context().time();
        address[] memory shelterers = bundleStore.getShelterers(bundleId);
        for (uint i = 0; i < shelterers.length; i++) {
            if (shelterers[i] == sheltererId) {
                return bundleStore.getShelteringExpirationDate(bundleId, sheltererId) > time.currentTimestamp();
            }
        }
        return false;
    }
}
