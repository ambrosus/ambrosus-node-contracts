/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";


contract BundleStore is Base {

    uint constant MAX_EXPIRATION_DATE = 32503680000; // year 3000

    struct Bundle {
        address[] shelterers;
        uint expirationDate;
    }

    event BundleStored(bytes32 bundleId, address creator);

    event SheltererAdded(bytes32 bundleId, address shelterer);

    event SheltererRemoved(bytes32 bundleId, address shelterer);

    mapping(bytes32 => Bundle) bundles;

    constructor(Head head) Base(head) public {}

    function bundleExists(bytes32 bundleId) view public returns (bool) {
        return bundles[bundleId].expirationDate > 0;
    }

    function getShelterers(bytes32 bundleId) view public returns (address[]) {
        return bundles[bundleId].shelterers;
    }

    function getExpirationDate(bytes32 bundleId) view public returns (uint) {
        return bundles[bundleId].expirationDate;
    }

    function store(bytes32 bundleId, address creator, uint expirationDate) public onlyContextInternalCalls {
        require(!bundleExists(bundleId));
        // solium-disable-next-line security/no-block-members
        require(expirationDate >= now);
        require(expirationDate < MAX_EXPIRATION_DATE);
        bundles[bundleId] = Bundle(new address[](1), expirationDate);
        bundles[bundleId].shelterers[0] = creator;
        emit BundleStored(bundleId, creator);
    }

    function addShelterer(bytes32 bundleId, address shelterer) public onlyContextInternalCalls {
        require(bundleExists(bundleId));

        for (uint i = 0; i < bundles[bundleId].shelterers.length; i++) {
            require(bundles[bundleId].shelterers[i] != shelterer);
        }
        bundles[bundleId].shelterers.push(shelterer);
        emit SheltererAdded(bundleId, shelterer);
    }

    function removeSheltererByIndex(bytes32 bundleId, uint index) public onlyContextInternalCalls {
        require(bundleExists(bundleId));
        require(bundles[bundleId].shelterers.length > index);

        bundles[bundleId].shelterers[index] = bundles[bundleId].shelterers[bundles[bundleId].shelterers.length - 1];
        delete bundles[bundleId].shelterers[bundles[bundleId].shelterers.length - 1];
        bundles[bundleId].shelterers.length -= 1;
    }

    function removeShelterer(bytes32 bundleId, address shelterer) public onlyContextInternalCalls {
        require(bundleExists(bundleId));

        for (uint i = 0; i < bundles[bundleId].shelterers.length; i++) {
            if (bundles[bundleId].shelterers[i] == shelterer) {
                removeSheltererByIndex(bundleId, i);
                emit SheltererRemoved(bundleId, shelterer);
                return;
            }
        }
    }
}
