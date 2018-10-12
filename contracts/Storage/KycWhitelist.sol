/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../Configuration/Consts.sol";


contract KycWhitelist is Ownable {

    struct Candidate {
        Consts.NodeType allowedRole;
        uint requiredDeposit;
    }

    mapping(address => Candidate) whitelist;

    function add(address candidate, Consts.NodeType role, uint deposit) public onlyOwner {
        require(!isWhitelisted(candidate));
        require(role == Consts.NodeType.ATLAS || role == Consts.NodeType.HERMES || role == Consts.NodeType.APOLLO);
        if(role == Consts.NodeType.APOLLO) {
            require(deposit > 0);
        }

        whitelist[candidate].allowedRole = role;
        whitelist[candidate].requiredDeposit = deposit;
    }

    function remove(address candidate) public onlyOwner {
        require(isWhitelisted(candidate));
        delete whitelist[candidate];
    }

    function isWhitelisted(address candidate) public view returns(bool) {
        return whitelist[candidate].allowedRole != Consts.NodeType.NONE;
    }

    function hasRoleAssigned(address candidate, Consts.NodeType role) public view returns(bool) {
        return whitelist[candidate].allowedRole == role;
    }

    function getRequiredDeposit(address candidate) public view returns(uint) {
        return whitelist[candidate].requiredDeposit;
    }

    function getRoleAssigned(address candidate) public view returns(Consts.NodeType role) {
        return whitelist[candidate].allowedRole;
    }
}
