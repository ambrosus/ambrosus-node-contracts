/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Storage/AtlasStakeStore.sol";
import "../Storage/BundleStore.sol";
import "../Storage/KycWhitelist.sol";
import "../Storage/PayoutsStore.sol";
import "../Storage/RolesStore.sol";
import "../Storage/ApolloDepositStore.sol";

import "../Configuration/Fees.sol";
import "../Configuration/Time.sol";
import "../Configuration/Config.sol";

import "../Middleware/Sheltering.sol";
import "../Middleware/ValidatorProxy.sol";

import "../Front/Challenges.sol";
import "../Front/Payouts.sol";
import "../Front/ShelteringTransfers.sol";
import "../Front/Uploads.sol";
import "../Front/Roles.sol";


contract Context {

    AtlasStakeStore public atlasStakeStore;
    BundleStore public bundleStore;
    KycWhitelist public kycWhitelist;
    Roles public roles;
    Sheltering public sheltering;
    Fees public fees;
    Challenges public challenges;
    PayoutsStore public payoutsStore;
    Payouts public payouts;
    ShelteringTransfers public shelteringTransfers;
    Time public time;
    Config public config;
    Uploads public uploads;
    RolesStore public rolesStore;
    ApolloDepositStore public apolloDepositStore;
    ValidatorProxy public validatorProxy;

    function initialize1(
        ValidatorProxy _validatorProxy,
        Time _time,
        Fees _fees,
        Config _config
    ) public {
        require(validatorProxy == address(0));
        validatorProxy = _validatorProxy;
        time = _time;
        fees = _fees;
        config = _config;
    }

    function initialize2(
        AtlasStakeStore _atlasStakeStore,
        BundleStore _bundleStore,
        KycWhitelist _kycWhitelist,
        PayoutsStore _payoutsStore,
        RolesStore _rolesStore,
        ApolloDepositStore _apolloDepositStore
    ) public {
        require(atlasStakeStore == address(0));
        atlasStakeStore = _atlasStakeStore;
        bundleStore = _bundleStore;
        kycWhitelist = _kycWhitelist;
        payoutsStore = _payoutsStore;
        rolesStore = _rolesStore;
        apolloDepositStore = _apolloDepositStore;
    }

    function initialize3(
        Roles _roles,
        Sheltering _sheltering,
        Challenges _challenges,
        Payouts _payouts,
        ShelteringTransfers _shelteringTransfers,
        Uploads _uploads
    ) public {
        require(roles == address(0));
        roles = _roles;
        sheltering = _sheltering;
        challenges = _challenges;
        payouts = _payouts;
        shelteringTransfers = _shelteringTransfers;
        uploads = _uploads;
    }

    function isInternalToContext(address contractAddress) view public returns (bool) {
        // solium-disable-next-line operator-whitespace
        return atlasStakeStore == contractAddress ||
        bundleStore == contractAddress ||
        kycWhitelist == contractAddress ||
        roles == contractAddress ||
        sheltering == contractAddress ||
        fees == contractAddress ||
        challenges == contractAddress ||
        payoutsStore == contractAddress ||
        shelteringTransfers == contractAddress ||
        config == contractAddress ||
        time == contractAddress ||
        uploads == contractAddress ||
        payouts == contractAddress ||
        rolesStore == contractAddress ||
        apolloDepositStore == contractAddress ||
        validatorProxy == contractAddress;
    }
}
