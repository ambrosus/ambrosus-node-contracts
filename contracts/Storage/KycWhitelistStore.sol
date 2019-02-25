/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "../Configuration/Consts.sol";


contract KycWhitelistStore is Base {

    constructor(Head _head) public Base(_head) { }

    struct Candidate {
        Consts.NodeType allowedRole;
        uint requiredDeposit;
    }

    mapping(address => Candidate) whitelist;

    function set(address candidate, Consts.NodeType role, uint deposit) public onlyContextInternalCalls {
        whitelist[candidate].allowedRole = role;
        whitelist[candidate].requiredDeposit = deposit;
    }

    function getRequiredDeposit(address candidate) public view returns(uint) {
        return whitelist[candidate].requiredDeposit;
    }

    function getRoleAssigned(address candidate) public view returns(Consts.NodeType role) {
        return whitelist[candidate].allowedRole;
    }
}
