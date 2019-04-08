/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "multisig-wallet-gnosis/contracts/MultiSigWallet.sol";

import "../Configuration/Config.sol";
import "../Boilerplate/Head.sol";
import "../Boilerplate/Multiplexer.sol";


contract MultiSig is Base, MultiSigWallet {
    Multiplexer private multiplexer;
    Config private config;
    address[] public cLevelOwners;

    modifier enoughOwners(uint ownersCount) {
        require(ownersCount == config.TOTAL_APPROVALS());
        _;
    }

    constructor(address[] _owners, Head _head, Config _config, Multiplexer _multiplexer) 
        public Base(_head) MultiSigWallet(_owners, _config.APPROVALS_REQUIRED())
    {
        require(_owners.length == _config.TOTAL_APPROVALS());

        multiplexer = _multiplexer;
        config = _config;

        for (uint32 i = 0; i < config.C_LEVEL_NUMBER(); i++) {
            cLevelOwners.push(_owners[i]);
        }
    }

    function isCLevelConfirmed(uint transactionId) public view returns (bool) {

        for (uint32 i = 0; i < cLevelOwners.length; i++) {
            if (confirmations[transactionId][cLevelOwners[i]]) {
                return true;
            }
        }

        return false;
    }
}