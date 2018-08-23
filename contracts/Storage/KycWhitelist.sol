/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../Configuration/Config.sol";


contract KycWhitelist is Ownable {

    struct Candidate {
        Config.NodeType allowedRole;
        uint requiredDeposit;
    }

    mapping(address => Candidate) whitelist;

    function add(address candidate, Config.NodeType role, uint deposit) public onlyOwner {
        require(!isWhitelisted(candidate));
        require(role == Config.NodeType.ATLAS || role == Config.NodeType.HERMES || role == Config.NodeType.APOLLO);

        whitelist[candidate].allowedRole = role;
        whitelist[candidate].requiredDeposit = deposit;
    }

    function remove(address candidate) public onlyOwner {
        require(isWhitelisted(candidate));
        delete whitelist[candidate];
    }

    function isWhitelisted(address candidate) public view returns(bool) {
        return whitelist[candidate].allowedRole != Config.NodeType.NONE;
    }

    function hasRoleAssigned(address candidate, Config.NodeType role) public view returns(bool) {
        return whitelist[candidate].allowedRole == role;
    }

    function getRequiredDeposit(address candidate) public view returns(uint) {
        return whitelist[candidate].requiredDeposit;
    }
}
