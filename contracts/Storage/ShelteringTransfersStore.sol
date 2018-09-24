/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";


contract ShelteringTransfersStore is Base {
    struct Transfer {
        address donorId;
        bytes32 bundleId;
    }

    mapping(bytes32 => Transfer) public transfers;

    constructor(Head _head) public Base(_head) { }

    function store(address donorId, bytes32 bundleId) onlyContextInternalCalls public returns(bytes32) {
        bytes32 transferId = getTransferId(donorId, bundleId);
        transfers[transferId] = Transfer(donorId, bundleId);
        return transferId;
    }

    function remove(bytes32 transferId) onlyContextInternalCalls public {
        delete transfers[transferId];
    }

    function getTransfer(bytes32 transferId) onlyContextInternalCalls view public returns(address donorId, bytes32 bundleId) {
        donorId = transfers[transferId].donorId;
        bundleId = transfers[transferId].bundleId;
    }

    function getTransferId(address sheltererId, bytes32 bundleId) onlyContextInternalCalls view public returns(bytes32) {
        return keccak256(abi.encodePacked(sheltererId, bundleId));
    }
}
