/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "../Middleware/Sheltering.sol";
import "../Configuration/Fees.sol";
import "../Storage/BundleStore.sol";
import "./Payouts.sol";


contract ShelteringTransfers is Base {

    struct Transfer {
        address donorId;
        bytes32 bundleId;
    }

    event TransferStarted(bytes32 transferId, address donorId, bytes32 bundleId);
    event TransferResolved(address donorId, address recipientId, bytes32 bundleId);
    event TransferCancelled(bytes32 transferId, address donorId, bytes32 bundleId);

    mapping(bytes32 => Transfer) public transfers;

    constructor(Head _head) public Base(_head) { }

    function start(bytes32 bundleId) public {
        requireTransferPossible(msg.sender, bundleId);

        bytes32 transferId = store(Transfer(msg.sender, bundleId));
        emit TransferStarted(transferId, msg.sender, bundleId);
    }

    function resolve(bytes32 transferId) public {
        Transfer storage transfer = transfers[transferId];
        Sheltering sheltering = context().sheltering();
        requireResolutionPossible(sheltering, transferId, transfer.bundleId);

        uint totalReward = transferGrant(sheltering, transfer.donorId, msg.sender, transfer.bundleId);
        sheltering.addShelterer(transfer.bundleId, msg.sender, totalReward);
        sheltering.removeShelterer(transfer.bundleId, transfer.donorId);
        emit TransferResolved(transfer.donorId, msg.sender, transfer.bundleId);
        delete transfers[transferId];
    }

    function cancel(bytes32 transferId) public {
        Transfer storage transfer = transfers[transferId];
        require(msg.sender == transfer.donorId);
        emit TransferCancelled(transferId, transfer.donorId, transfer.bundleId);
        delete transfers[transferId];
    }

    function getTransferId(address sheltererId, bytes32 bundleId) public pure returns(bytes32) {
        return keccak256(abi.encodePacked(sheltererId, bundleId));
    }

    function getDonor(bytes32 transferId) public view returns(address) {
        return transfers[transferId].donorId;
    }

    function getTransferredBundle(bytes32 transferId) public view returns(bytes32) {
        return transfers[transferId].bundleId;
    }

    function transferIsInProgress(bytes32 transferId) public view returns(bool) {
        return transfers[transferId].donorId != address(0x0);
    }

    function store(Transfer transfer) private returns(bytes32) {
        bytes32 transferId = getTransferId(transfer.donorId, transfer.bundleId);
        transfers[transferId] = transfer;
        return transferId;
    }

    function transferGrant(Sheltering sheltering, address donor, address recipient, bytes32 bundleId) private returns (uint) {
        Payouts payouts = context().payouts();
        (uint startDate, uint storagePeriods, uint totalReward) = sheltering.getShelteringData(bundleId, donor);
        payouts.transferShelteringReward(
            donor,
            recipient,
            startDate,
            (uint64)(storagePeriods),
            totalReward);

        return totalReward;
    }

    function requireTransferPossible(address donorId, bytes32 bundleId) private view {
        Sheltering sheltering = context().sheltering();
        require(sheltering.isSheltering(donorId, bundleId));
        require(!transferIsInProgress(getTransferId(donorId, bundleId)));
    }

    function requireResolutionPossible(Sheltering sheltering, bytes32 transferId, bytes32 bundleId) private view {
        require(!sheltering.isSheltering(msg.sender, bundleId));
        require(transferIsInProgress(transferId));
    }
}
