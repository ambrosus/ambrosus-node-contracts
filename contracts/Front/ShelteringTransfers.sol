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
import "../Lib/SafeMathExtensions.sol";
import "../Lib/DmpAlgorithm.sol";
import "../Front/Challenges.sol";
import "../Front/DmpAtlasSelectionBase.sol";
import "../Middleware/Sheltering.sol";
import "../Storage/AtlasStakeStore.sol";
import "../Storage/ShelteringTransfersStore.sol";
import "../Storage/TransfersEventEmitter.sol";


contract ShelteringTransfers is DmpAtlasSelectionBase {

    using SafeMath for uint;
    using SafeMath for uint32;
    using SafeMath for uint64;
    using SafeMathExtensions for uint;

    Time private time;
    Sheltering private sheltering;
    ShelteringTransfersStore private shelteringTransfersStore;
    Challenges private challenges;
    TransfersEventEmitter private transfersEventEmitter;

    constructor(Head _head, Time _time, Sheltering _sheltering, AtlasStakeStore _atlasStakeStore, Config _config,
        ShelteringTransfersStore _shelteringTransfersStore,
        Challenges _challenges, TransfersEventEmitter _transfersEventEmitter)
    public DmpAtlasSelectionBase(_head, _atlasStakeStore, _config) {
        time = _time;
        sheltering = _sheltering;
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

    function getTransferredBundle(bytes32 transferId) public view returns(bytes32) {
        (, bytes32 bundleId, ) = shelteringTransfersStore.getTransfer(transferId);
        return bundleId;
    }

    function transferIsInProgress(bytes32 transferId) public view returns(bool) {
        (address donorId,, ) = shelteringTransfersStore.getTransfer(transferId);
        return donorId != address(0x0);
    }

    function canResolve(address resolverId, bytes32 transferId) public view returns (bool) {
        (, bytes32 bundleId, ) = shelteringTransfersStore.getTransfer(transferId);

        // solium-disable-next-line operator-whitespace
        return transferIsInProgress(transferId) &&
        !sheltering.isSheltering(bundleId, resolverId) &&
        resolverId == getTransferDesignatedShelterer(transferId) &&
        atlasStakeStore.getStake(resolverId) > 0;
    }

    function getTransferCreationTime(bytes32 transferId) public view returns (uint64) {
        (,, uint64 creationTime) = shelteringTransfersStore.getTransfer(transferId);
        return creationTime;
    }

    function getTransferDesignatedShelterer(bytes32 transferId) public view returns (address) {
        uint transferDuration = time.currentTimestamp().sub(getTransferCreationTime(transferId));
        uint currentRound = transferDuration.div(config.ROUND_DURATION());
        uint32 dmpIndex;

        if (currentRound < config.FIRST_PHASE_DURATION().div(config.ROUND_DURATION())) {
            (uint atlasCount, uint32 dmpTier) = getDesignatedSheltererTier(transferId);
            dmpIndex = DmpAlgorithm.qualifyShelterer(transferId, atlasCount, currentRound);
            return atlasStakeStore.getStakerWithStakeAtIndex(config.ATLAS_STAKE(dmpTier), dmpIndex);
        } else {
            dmpIndex = DmpAlgorithm.qualifyShelterer(transferId, atlasStakeStore.getNumberOfStakers(), currentRound);
            return atlasStakeStore.getStakerAtIndex(dmpIndex);
        }
    }

    function requireTransferPossible(address donorId, bytes32 bundleId) private view {
        require(sheltering.isSheltering(bundleId, donorId));
        require(!transferIsInProgress(getTransferId(donorId, bundleId)));
        require(!challenges.challengeIsInProgress(challenges.getChallengeId(donorId, bundleId)));
    }
}
