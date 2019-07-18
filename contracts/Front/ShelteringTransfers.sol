/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "../Configuration/Config.sol";
import "../Configuration/Time.sol";
import "../Lib/DmpAlgorithm.sol";
import "../Front/DmpAtlasSelectionBase.sol";
import "../Front/Challenges.sol";
import "../Middleware/Sheltering.sol";
import "../Storage/AtlasStakeStore.sol";
import "../Storage/ShelteringTransfersStore.sol";
import "../Storage/TransfersEventEmitter.sol";


contract ShelteringTransfers is DmpAtlasSelectionBase {

    ShelteringTransfersStore private shelteringTransfersStore;
    Challenges private challenges;
    TransfersEventEmitter private transfersEventEmitter;

    constructor(Head _head, Time _time, Sheltering _sheltering, AtlasStakeStore _atlasStakeStore, Config _config,
        ShelteringTransfersStore _shelteringTransfersStore,
        Challenges _challenges, TransfersEventEmitter _transfersEventEmitter)
    public DmpAtlasSelectionBase(_head, _time, _sheltering, _atlasStakeStore, _config) {
        shelteringTransfersStore = _shelteringTransfersStore;
        challenges = _challenges;
        transfersEventEmitter = _transfersEventEmitter;
    }

    function() public payable {}

    function start(bytes32 bundleId) public {
        requireTransferPossible(msg.sender, bundleId);
        bytes32 transferId = shelteringTransfersStore.store(msg.sender, bundleId, time.currentTimestamp());
        transfersEventEmitter.transferStarted(transferId, msg.sender, bundleId);
    }

    function resolve(bytes32 transferId) public {
        require(canResolve(msg.sender, transferId));

        (address donorId, bytes32 bundleId, ) = shelteringTransfersStore.getTransfer(transferId);

        sheltering.transferSheltering(bundleId, donorId, msg.sender);

        transfersEventEmitter.transferResolved(transferId, donorId, bundleId, msg.sender);
        shelteringTransfersStore.remove(transferId);
    }

    function cancel(bytes32 transferId) public {
        (address donorId, bytes32 bundleId, ) = shelteringTransfersStore.getTransfer(transferId);
        require(msg.sender == donorId);
        transfersEventEmitter.transferCancelled(transferId, donorId, bundleId);
        shelteringTransfersStore.remove(transferId);
    }

    function getTransferId(address sheltererId, bytes32 bundleId) public view returns(bytes32) {
        return shelteringTransfersStore.getTransferId(sheltererId, bundleId);
    }

    function getDonor(bytes32 transferId) public view returns(address) {
        (address donorId,, ) = shelteringTransfersStore.getTransfer(transferId);
        return donorId;
    }

    function getRequestedBundle(bytes32 requestId) public view returns (bytes32) {
        (, bytes32 bundleId, ) = shelteringTransfersStore.getTransfer(requestId);
        return bundleId;
    }

    function computeRequestDmpBaseHash(bytes32 requestId) public view returns (bytes32) {
        return requestId;
    }

    function getRequestCreationTime(bytes32 requestId) public view returns (uint64) {
        (,, uint64 creationTime) = shelteringTransfersStore.getTransfer(requestId);
        return creationTime;
    }

    function requestIsInProgress(bytes32 requestId) public view returns (bool) {
        (address donorId,, ) = shelteringTransfersStore.getTransfer(requestId);
        return donorId != address(0x0);
    }

    function requireTransferPossible(address donorId, bytes32 bundleId) private view {
        require(sheltering.isSheltering(bundleId, donorId));
        require(!requestIsInProgress(getTransferId(donorId, bundleId)));
        require(!challenges.requestIsInProgress(challenges.getChallengeId(donorId, bundleId)));
    }
}
