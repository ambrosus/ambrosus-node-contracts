/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "../Configuration/Fees.sol";
import "../Middleware/Sheltering.sol";
import "./Challenges.sol";
import "../Configuration/Config.sol";


contract Uploads is Base {    

    using SafeMath for uint;

    constructor(Head _head) Base(_head) public {         
    }

    event BundleUploaded(bytes32 bundleId, uint storagePeriods);

    function registerBundle(bytes32 bundleId, uint64 storagePeriods) public payable {
        Fees fees = context().fees();
        Config config = context().config();
        uint fee = fees.getFeeForUpload(storagePeriods);

        require(storagePeriods > 0);
        require(msg.value == fee);

        context().sheltering().store(bundleId, msg.sender, storagePeriods);
        (uint challengeFee, uint validatorsFee, uint burnFee) = fees.calculateFeeSplit(msg.value);
        block.coinbase.transfer(validatorsFee);
        config.BURN_ADDRESS().transfer(burnFee);
        context().challenges().startForSystem.value(challengeFee)(msg.sender, bundleId, 7);

        emit BundleUploaded(bundleId, storagePeriods);
    }
}
