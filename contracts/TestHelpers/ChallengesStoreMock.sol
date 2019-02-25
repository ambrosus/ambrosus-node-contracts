/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Storage/ChallengesStore.sol";


contract ChallengesStoreMock is ChallengesStore {

    constructor(Head _head) public ChallengesStore(_head) {
    }

    function injectChallenge(
        address sheltererId,
        bytes32 bundleId,
        address challengerId,
        uint feePerChallenge,
        uint64 creationTime,
        uint8 activeCount,
        uint sequenceNumber)
    public payable returns (bytes32)
    {
        bytes32 challengeId = getChallengeId(sheltererId, bundleId);
        challenges[challengeId] = Challenge(sheltererId, bundleId, challengerId, feePerChallenge, creationTime, activeCount, sequenceNumber);
        activeChallengesOnBundleCount[bundleId] = activeChallengesOnBundleCount[bundleId].add(activeCount).castTo32();
        return challengeId;
    }
}
