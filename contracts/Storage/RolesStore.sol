/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "../Configuration/Config.sol";
import "./KycWhitelist.sol";

contract RolesStore is Base {

    struct NodeInfo {
        Config.NodeType role;
        string url;
    }

    mapping(address => NodeInfo) public nodes;

    constructor(Head _head) public Base(_head) { }

    function setRole(address node, Config.NodeType role) public onlyContextInternalCalls {
        KycWhitelist kycWhitelist = context().kycWhitelist();
        if (role != Config.NodeType.NONE) {
            require(kycWhitelist.hasRoleAssigned(node, role));
        }

        nodes[node].role = role;
    }

    function setUrl(address node, string url) public onlyContextInternalCalls {
        require(getRole(node) == Config.NodeType.ATLAS || getRole(node) == Config.NodeType.HERMES);
        nodes[node].url = url;
    }

    function getRole(address node) public view returns(Config.NodeType) {
        return nodes[node].role;
    }

    function getUrl(address node) public view returns(string) {
        return nodes[node].url;
    }
}
