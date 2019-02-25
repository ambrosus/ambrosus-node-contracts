/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.24;

import "../Boilerplate/Head.sol";


contract ApolloDepositStore is Base {

    mapping(address => uint) deposits;

    constructor(Head _head) public Base(_head) { }

    function storeDeposit(address apollo) public payable onlyContextInternalCalls {
        require(!isDepositing(apollo));
        deposits[apollo] = msg.value;
    }

    function releaseDeposit(address apollo, address refundAddress) public onlyContextInternalCalls returns (uint) {
        require(refundAddress != address(0));
        require(isDepositing(apollo));
        uint amountToTransfer = deposits[apollo];
        deposits[apollo] = 0;
        refundAddress.transfer(amountToTransfer);
        return amountToTransfer;
    }

    function isDepositing(address apollo) public view returns(bool) {
        return deposits[apollo] > 0;
    }
}
