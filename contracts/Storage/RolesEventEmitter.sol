/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "../Configuration/Consts.sol";


contract RolesEventEmitter is Base {

    constructor(Head _head) Base(_head) public {}

    event NodeOnboarded(address nodeAddress, uint placedDeposit, string nodeUrl, Consts.NodeType role);
    event NodeRetired(address nodeAddress, uint releasedDeposit, Consts.NodeType role);
    event NodeUrlChanged(address nodeAddress, string oldNodeUrl, string newNodeUrl);

    function nodeOnboarded(address nodeAddress, uint placedDeposit, string nodeUrl, Consts.NodeType role) public onlyContextInternalCalls {
        emit NodeOnboarded(nodeAddress, placedDeposit, nodeUrl, role);
    }

    function nodeRetired(address nodeAddress, uint releasedDeposit, Consts.NodeType role) public onlyContextInternalCalls {
        emit NodeRetired(nodeAddress, releasedDeposit, role);
    }

    function nodeUrlChanged(address nodeAddress, string oldNodeUrl, string newNodeUrl) public onlyContextInternalCalls {
        emit NodeUrlChanged(nodeAddress, oldNodeUrl, newNodeUrl);
    }
}
