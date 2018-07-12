/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";


import "../Boilerplate/Head.sol";
import "../Storage/BundleStore.sol";
import "../Storage/StakeStore.sol";


contract Sheltering is Base {

    using SafeMath for uint;

    // TODO calculate reward properly
    uint constant MOCK_SHELTERING_REWARD = 1 ether;

    constructor(Head _head) public Base(_head) { }

    function store(bytes32 bundleId, address creator, uint storagePeriods) public onlyContextInternalCalls {
        BundleStore bundleStore = context().bundleStore();                
        StakeStore stakeStore = context().stakeStore();    
        stakeStore.incrementStorageUsed(creator);
        bundleStore.store(bundleId, creator, storagePeriods);
    }

    function getShelteringData(bytes32 bundleId, address shelterer) public view onlyContextInternalCalls
    returns (uint startingDate, uint storagePeriods, uint totalReward)
    {
        BundleStore bundleStore = context().bundleStore();
        return (
            bundleStore.getShelteringStartDate(bundleId, shelterer),
            bundleStore.getStoragePeriodsCount(bundleId),
            bundleStore.getTotalShelteringReward(bundleId, shelterer)
        );
    }

    function addShelterer(bytes32 bundleId, address shelterer) public onlyContextInternalCalls {
        StakeStore stakeStore = context().stakeStore();
        BundleStore bundleStore = context().bundleStore();

        stakeStore.incrementStorageUsed(shelterer);
        bundleStore.addShelterer(bundleId, shelterer, MOCK_SHELTERING_REWARD);
    }

    function removeShelterer(bytes32 bundleId, address shelterer) public onlyContextInternalCalls {              
        StakeStore stakeStore = context().stakeStore();    
        BundleStore bundleStore = context().bundleStore();

        stakeStore.decrementStorageUsed(shelterer);
        bundleStore.removeShelterer(bundleId, shelterer);
    }

    function isSheltering(address sheltererId, bytes32 bundleId) public view returns(bool) {
        BundleStore bundleStore = context().bundleStore();
        address[] memory shelterers = bundleStore.getShelterers(bundleId);
        for (uint i = 0; i < shelterers.length; i++) {
            if (shelterers[i] == sheltererId) {
                return true;
            }
        }
        return false;
    }
}
