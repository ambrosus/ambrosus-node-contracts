/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../Boilerplate/Head.sol";


contract KycWhitelist is Base, Ownable {

    mapping(address => bool) whitelist;
    
    constructor(Head _head) public Base(_head) {    
    }

    function add(address _cadidate) public onlyOwner {
        whitelist[_cadidate] = true;
    }

    function remove(address _candidate) public onlyOwner {
        whitelist[_candidate] = false;
    }

    function isWhitelisted(address _candidate) public view  onlyContextInternalCalls returns(bool) {
        return whitelist[_candidate];
    }
}
