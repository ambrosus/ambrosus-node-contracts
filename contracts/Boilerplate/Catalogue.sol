/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Storage/KycWhitelist.sol";
import "../Front/Roles.sol";
import "../Configuration/Fees.sol";
import "../Front/Challenges.sol";
import "../Front/Payouts.sol";
import "../Front/ShelteringTransfers.sol";
import "../Middleware/Sheltering.sol";
import "../Front/Uploads.sol";
import "../Configuration/Config.sol";


contract Catalogue {
    KycWhitelist public kycWhitelist;
    Roles public roles;
    Fees public fees;
    Challenges public challenges;
    Payouts public payouts;
    ShelteringTransfers public shelteringTransfers;
    Sheltering public sheltering;
    Uploads public uploads;
    Config public config;

    constructor(
        KycWhitelist _kycWhitelist,
        Roles _roles,
        Fees _fees,
        Challenges _challenges,
        Payouts _payouts,
        ShelteringTransfers _shelteringTransfers,
        Sheltering _sheltering,
        Uploads _uploads,
        Config _config
    ) public {
        kycWhitelist = _kycWhitelist;
        roles = _roles;
        fees = _fees;
        challenges = _challenges;
        payouts = _payouts;
        shelteringTransfers = _shelteringTransfers;
        sheltering = _sheltering;
        uploads = _uploads;
        config = _config;
    }
}
