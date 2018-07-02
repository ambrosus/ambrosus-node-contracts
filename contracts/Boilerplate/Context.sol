/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Storage/BundleRegistry.sol";
import "../Storage/StakeStore.sol";
import "../Storage/BundleStore.sol";
import "../Storage/KycWhitelist.sol";
import "../Storage/PayoutsStore.sol";

import "../Configuration/Roles.sol";
import "../Configuration/Fees.sol";
import "../Configuration/Time.sol";
import "../Configuration/Config.sol";

import "../Middleware/Sheltering.sol";

import "../Front/Stakes.sol";
import "../Front/Challenges.sol";
import "../Front/Payouts.sol";
import "../Front/ShelteringTransfers.sol";
import "../Front/Uploads.sol";


contract Context {

    BundleRegistry public bundleRegistry;
    StakeStore public stakeStore;
    BundleStore public bundleStore;
    KycWhitelist public kycWhitelist;
    Roles public roles;
    Stakes public stakes;
    Sheltering public sheltering;
    Fees public fees;
    Challenges public challenges;
    PayoutsStore public payoutsStore;
    Payouts public payouts;
    ShelteringTransfers public shelteringTransfers;
    Time public time;
    Config public config;
    Uploads public uploads;

    constructor(
        Time _time,
        BundleRegistry _bundleRegistry,
        StakeStore _stakeStore,
        BundleStore _bundleStore,
        KycWhitelist _kycWhitelist,        
        Roles _roles,
        Stakes _stakes,
        Sheltering _sheltering,
        Fees _fees,
        Challenges _challenges,
        PayoutsStore _payoutsStore,
        Payouts _payouts,
        ShelteringTransfers _shelteringTransfers,
        Config _config,
        Uploads _uploads 
    ) public {
        time = _time;
        bundleRegistry = _bundleRegistry;
        stakeStore = _stakeStore;
        bundleStore = _bundleStore;
        kycWhitelist = _kycWhitelist;
        roles = _roles;
        stakes = _stakes;
        sheltering = _sheltering;
        fees = _fees;
        challenges = _challenges;
        payoutsStore = _payoutsStore;
        payouts = _payouts;
        shelteringTransfers = _shelteringTransfers;
        config = _config;
        uploads = _uploads;
    }

    function isInternalToContext(address contractAddress) view public returns (bool) {
        // solium-disable-next-line operator-whitespace
        return bundleRegistry == contractAddress ||
            stakeStore == contractAddress ||
            bundleStore == contractAddress ||
            kycWhitelist == contractAddress ||
            roles == contractAddress ||
            stakes == contractAddress ||
            sheltering == contractAddress ||
            fees == contractAddress ||
            challenges == contractAddress ||
            payoutsStore == contractAddress ||
            shelteringTransfers == contractAddress ||
            config == contractAddress ||
            time == contractAddress ||
            uploads == contractAddress ||            
            payouts == contractAddress;
    }
}
