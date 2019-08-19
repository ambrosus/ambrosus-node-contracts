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
import "../Lib/SafeMathExtensions.sol";
import "../Front/DmpAtlasSelectionBase.sol";
import "../Front/Challenges.sol";
import "../Middleware/Sheltering.sol";
import "../Storage/AtlasStakeStore.sol";
import "../Storage/ShelteringTransfersStore.sol";
import "../Storage/TransfersEventEmitter.sol";


contract ShelteringTransfers is DmpAtlasSelectionBase {

    using SafeMathExtensions for uint;

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

    function canResolve(address resolverId, bytes32 shelteringInviteId) public view returns (bool) {
        bytes32 bundleId = getBundle(shelteringInviteId);

        // solium-disable-next-line operator-whitespace
        return isInProgress(shelteringInviteId) &&
            !sheltering.isSheltering(bundleId, resolverId) &&
            resolverId == getDesignatedShelterer(shelteringInviteId) &&
            atlasStakeStore.getStake(resolverId) > 0;
    }

    function getTransferId(address sheltererId, bytes32 bundleId) public view returns(bytes32) {
        return shelteringTransfersStore.getTransferId(sheltererId, bundleId);
    }

    function getDonor(bytes32 transferId) public view returns(address) {
        (address donorId,, ) = shelteringTransfersStore.getTransfer(transferId);
        return donorId;
    }

    function getBundle(bytes32 shelteringInviteId) public view returns (bytes32) {
        (, bytes32 bundleId, ) = shelteringTransfersStore.getTransfer(shelteringInviteId);
        return bundleId;
    }

    function computeDmpBaseHash(bytes32 shelteringInviteId) public view returns (bytes32) {
        return shelteringInviteId;
    }

    function getCreationTime(bytes32 shelteringInviteId) public view returns (uint64) {
        (,, uint creationTime) = shelteringTransfersStore.getTransfer(shelteringInviteId);
        return creationTime.castTo64();
    }

    function isInProgress(bytes32 shelteringInviteId) public view returns (bool) {
        (address donorId,, ) = shelteringTransfersStore.getTransfer(shelteringInviteId);
        return donorId != address(0x0);
    }

    function requireTransferPossible(address donorId, bytes32 bundleId) private view {
        require(sheltering.isSheltering(bundleId, donorId));
        require(!isInProgress(getTransferId(donorId, bundleId)));
        require(!challenges.isInProgress(challenges.getChallengeId(donorId, bundleId)));
    }
}
