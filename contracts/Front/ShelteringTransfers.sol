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


contract ShelteringTransfers is Base {

    struct Transfer {
        address donorId;
        bytes32 bundleId;
    }

    event TransferStarted(bytes32 transferId, address donorId, bytes32 bundleId);

    mapping(bytes32 => Transfer) public transfers;

    constructor(Head _head) public Base(_head) { }

    function start(bytes32 bundleId) public {
        validateTransfer(msg.sender, bundleId);

        Transfer memory transfer = Transfer(msg.sender, bundleId);
        bytes32 transferId = store(transfer);
        emit TransferStarted(transferId, msg.sender, bundleId);
    }

    function cancel(bytes32 transferId) public {
        require(msg.sender == transfers[transferId].donorId);
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

    function validateTransfer(address donorId, bytes32 bundleId) private view {
        Sheltering sheltering = context().sheltering();
        require(sheltering.isSheltering(donorId, bundleId));
        require(!transferIsInProgress(getTransferId(donorId, bundleId)));
    }
}
