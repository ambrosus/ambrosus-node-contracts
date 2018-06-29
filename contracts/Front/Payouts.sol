/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";


contract Payouts is Base {
    constructor(Head _head) public Base(_head) { }

    function withdraw() public {
        
    }

    function available(uint64 period) public {

    }

    function grantChallengeResolutionReward(address beneficiary, bytes32 bundleId) public payable onlyContextInternalCalls {
    
    }
     
    function revokeChallengeResolutionReward(address beneficiary, bytes32 bundleId, address refundAddress) public onlyContextInternalCalls {

    }
}
