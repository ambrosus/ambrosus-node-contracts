/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";


contract ChallengesEventEmitter is Base {

    constructor(Head _head) Base(_head) public {}

    event ChallengeCreated(address sheltererId, bytes32 bundleId, bytes32 challengeId, uint count);
    event ChallengeResolved(address sheltererId, bytes32 bundleId, bytes32 challengeId, address resolverId);
    event ChallengeTimeout(address sheltererId, bytes32 bundleId, bytes32 challengeId, uint penalty);

    function challengeCreated(address sheltererId, bytes32 bundleId, bytes32 challengeId, uint count) public onlyContextInternalCalls {
        emit ChallengeCreated(sheltererId, bundleId, challengeId, count);
    }

    function challengeResolved(address sheltererId, bytes32 bundleId, bytes32 challengeId, address resolverId) public onlyContextInternalCalls {
        emit ChallengeResolved(sheltererId, bundleId, challengeId, resolverId);
    }

    function challengeTimeout(address sheltererId, bytes32 bundleId, bytes32 challengeId, uint penalty) public onlyContextInternalCalls {
        emit ChallengeTimeout(sheltererId, bundleId, challengeId, penalty);
    }
}
