/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Head.sol";
import "../Configuration/Fees.sol";
import "../Configuration/Config.sol";
import "../Middleware/Sheltering.sol";
import "../Front/Challenges.sol";


contract Uploads is Base {

    using SafeMath for uint;

    uint8 constant SYSTEM_CHALLENGES_COUNT = 7;

    Config private config;
    Fees private fees;
    Sheltering private sheltering;
    Challenges private challenges;

    constructor(Head _head, Config _config, Fees _fees, Sheltering _sheltering, Challenges _challenges) Base(_head) public {
        config = _config;
        fees = _fees;
        sheltering = _sheltering;
        challenges = _challenges;
    }

    event BundleUploaded(bytes32 bundleId, uint storagePeriods);

    function registerBundle(bytes32 bundleId, uint64 storagePeriods) public payable {
        uint fee = fees.getFeeForUpload(storagePeriods);

        require(storagePeriods > 0);
        require(msg.value == fee);

        sheltering.storeBundle(bundleId, msg.sender, storagePeriods);
        (uint challengeFee, uint validatorsFee) = fees.calculateFeeSplit(msg.value);
        block.coinbase.transfer(validatorsFee);
        challenges.startForSystem.value(challengeFee)(msg.sender, bundleId, SYSTEM_CHALLENGES_COUNT);

        emit BundleUploaded(bundleId, storagePeriods);
    }
}
