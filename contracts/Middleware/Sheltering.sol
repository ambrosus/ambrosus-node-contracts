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

    constructor(Head _head) public Base(_head) { }

    function store(bytes32 bundleId, address creator, uint storagePeriods) public onlyContextInternalCalls {
        BundleStore bundleStore = context().bundleStore();                
        StakeStore stakeStore = context().stakeStore();    
        stakeStore.incrementStorageUsed(creator);
        bundleStore.store(bundleId, creator, storagePeriods);
    }

    function addShelterer(bytes32 bundleId, address shelterer) public onlyContextInternalCalls {
        StakeStore stakeStore = context().stakeStore();
        BundleStore bundleStore = context().bundleStore();

        stakeStore.incrementStorageUsed(shelterer);
        bundleStore.addShelterer(bundleId, shelterer);
    }

    function removeShelterer(bytes32 bundleId, address shelterer) public onlyContextInternalCalls {              
        StakeStore stakeStore = context().stakeStore();    
        BundleStore bundleStore = context().bundleStore();

        stakeStore.decrementStorageUsed(shelterer);
        bundleStore.removeShelterer(bundleId, shelterer);
    }

    function canStore(address node) public view returns (bool) {
        StakeStore stakeStore = context().stakeStore();
        return stakeStore.canStore(node);
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
