/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "../Middleware/Sheltering.sol";
import "../Storage/ShelteringTransfersStore.sol";


contract ShelteringTransfers is Base {

    struct Transfer {
        address donorId;
        bytes32 bundleId;
    }

    event TransferStarted(bytes32 transferId, address donorId, bytes32 bundleId);
    event TransferResolved(address donorId, address recipientId, bytes32 bundleId);
    event TransferCancelled(bytes32 transferId, address donorId, bytes32 bundleId);

    Sheltering private sheltering;
    ShelteringTransfersStore private shelteringTransfersStore;

    constructor(Head _head, Sheltering _sheltering, ShelteringTransfersStore _shelteringTransfersStore) public Base(_head) {
        sheltering = _sheltering;
        shelteringTransfersStore = _shelteringTransfersStore;
    }

    function() public payable {}

    function start(bytes32 bundleId) public {
        requireTransferPossible(msg.sender, bundleId);
        bytes32 transferId = shelteringTransfersStore.store(msg.sender, bundleId);
        emit TransferStarted(transferId, msg.sender, bundleId);
    }

    function resolve(bytes32 transferId) public {
        (address donorId, bytes32 bundleId) = shelteringTransfersStore.getTransfer(transferId);
        requireResolutionPossible(transferId, bundleId);

        sheltering.transferSheltering(bundleId, donorId, msg.sender);

        emit TransferResolved(donorId, msg.sender, bundleId);
        shelteringTransfersStore.remove(transferId);
    }

    function cancel(bytes32 transferId) public {
        (address donorId, bytes32 bundleId) = shelteringTransfersStore.getTransfer(transferId);
        require(msg.sender == donorId);
        emit TransferCancelled(transferId, donorId, bundleId);
        shelteringTransfersStore.remove(transferId);
    }

    function getTransferId(address sheltererId, bytes32 bundleId) public view returns(bytes32) {
        return shelteringTransfersStore.getTransferId(sheltererId, bundleId);
    }

    function getDonor(bytes32 transferId) public view returns(address) {
        (address donorId, ) = shelteringTransfersStore.getTransfer(transferId);
        return donorId;
    }

    function getTransferredBundle(bytes32 transferId) public view returns(bytes32) {
        (, bytes32 bundleId) = shelteringTransfersStore.getTransfer(transferId);
        return bundleId;
    }

    function transferIsInProgress(bytes32 transferId) public view returns(bool) {
        (address donorId, ) = shelteringTransfersStore.getTransfer(transferId);
        return donorId != address(0x0);
    }

    function requireTransferPossible(address donorId, bytes32 bundleId) private view {
        require(sheltering.isSheltering(bundleId, donorId));
        require(!transferIsInProgress(getTransferId(donorId, bundleId)));
    }

    function requireResolutionPossible(bytes32 transferId, bytes32 bundleId) private view {
        require(!sheltering.isSheltering(bundleId, msg.sender));
        require(transferIsInProgress(transferId));
    }
}
