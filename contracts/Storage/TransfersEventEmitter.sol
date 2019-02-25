/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";


contract TransfersEventEmitter is Base {

    constructor(Head _head) Base(_head) public {}

    event TransferStarted(bytes32 transferId, address donorId, bytes32 bundleId);
    event TransferResolved(bytes32 transferId, address donorId, bytes32 bundleId, address recipientId);
    event TransferCancelled(bytes32 transferId, address donorId, bytes32 bundleId);

    function transferStarted(bytes32 transferId, address donorId, bytes32 bundleId) public onlyContextInternalCalls {
        emit TransferStarted(transferId, donorId, bundleId);
    }

    function transferResolved(bytes32 transferId, address donorId, bytes32 bundleId, address recipientId) public onlyContextInternalCalls {
        emit TransferResolved(transferId, donorId, bundleId, recipientId);
    }

    function transferCancelled(bytes32 transferId, address donorId, bytes32 bundleId) public onlyContextInternalCalls {
        emit TransferCancelled(transferId, donorId, bundleId);
    }
}
