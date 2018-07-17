/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "../Configuration/Config.sol";


contract RolesStore is Base {
    mapping(address => Config.NodeType) public roles;
    mapping(address => string) public urls;

    constructor(Head _head) public Base(_head) { }

    function setRole(address node, Config.NodeType role) public onlyContextInternalCalls {
        roles[node] = role;
    }

    function setUrl(address node, string url) public onlyContextInternalCalls {
        require(getRole(node) == Config.NodeType.ATLAS || getRole(node) == Config.NodeType.HERMES);
        urls[node] = url;
    }

    function getRole(address node) public view returns(Config.NodeType) {
        return roles[node];
    }

    function getUrl(address node) public view returns(string) {
        return urls[node];
    }
}
