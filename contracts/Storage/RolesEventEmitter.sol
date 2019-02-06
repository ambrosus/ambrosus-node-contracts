/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "../Configuration/Consts.sol";


contract RolesEventEmitter is Base {

    constructor(Head _head) Base(_head) public {}

    event MasternodeOnboarded(address nodeAddress, uint placedDeposit, string nodeUrl, Consts.NodeType role);
    event MasternodeRetired(address nodeAddress, uint releasedDeposit, Consts.NodeType role);
    event MasternodeUrlChanged(address nodeAddress, string oldNodeUrl, string newNodeUrl);

    function masternodeOnboarded(address nodeAddress, uint placedDeposit, string nodeUrl, Consts.NodeType role) public onlyContextInternalCalls {
        emit MasternodeOnboarded(nodeAddress, placedDeposit, nodeUrl, role);
    }

    function masternodeRetired(address nodeAddress, uint releasedDeposit, Consts.NodeType role) public onlyContextInternalCalls {
        emit MasternodeRetired(nodeAddress, releasedDeposit, role);
    }

    function masternodeUrlChanged(address nodeAddress, string oldNodeUrl, string newNodeUrl) public onlyContextInternalCalls {
        emit MasternodeUrlChanged(nodeAddress, oldNodeUrl, newNodeUrl);
    }
}