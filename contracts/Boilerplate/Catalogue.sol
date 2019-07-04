/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Configuration/Fees.sol";
import "../Configuration/Time.sol";
import "../Configuration/Config.sol";
import "../Front/KycWhitelist.sol";
import "../Front/Roles.sol";
import "../Front/Payouts.sol";
import "../Front/ShelteringTransfers.sol";
import "../Front/Challenges.sol";
import "../Front/Uploads.sol";
import "../Middleware/Sheltering.sol";
import "../Middleware/ValidatorProxy.sol";

import "../Storage/ApolloDepositStore.sol";
import "../Storage/AtlasStakeStore.sol";
import "../Storage/BundleStore.sol";
import "../Storage/ChallengesStore.sol";
import "../Storage/KycWhitelistStore.sol";
import "../Storage/PayoutsStore.sol";
import "../Storage/RolesStore.sol";
import "../Storage/ShelteringTransfersStore.sol";
import "../Storage/RolesEventEmitter.sol";
import "../Storage/TransfersEventEmitter.sol";
import "../Storage/ChallengesEventEmitter.sol";
import "../Storage/RewardsEventEmitter.sol";


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
    ValidatorProxy public validatorProxy;
    Time public time;

    constructor(
        KycWhitelist _kycWhitelist,
        Roles _roles,
        Fees _fees,
        Time _time,
        Challenges _challenges,
        Payouts _payouts,
        ShelteringTransfers _shelteringTransfers,
        Sheltering _sheltering,
        Uploads _uploads,
        Config _config,
        ValidatorProxy _validatorProxy
    ) public {
        kycWhitelist = _kycWhitelist;
        roles = _roles;
        fees = _fees;
        time = _time;
        challenges = _challenges;
        payouts = _payouts;
        shelteringTransfers = _shelteringTransfers;
        sheltering = _sheltering;
        uploads = _uploads;
        config = _config;
        validatorProxy = _validatorProxy;
    }
}


contract StorageCatalogue {
    ApolloDepositStore public apolloDepositStore;
    AtlasStakeStore public atlasStakeStore;
    BundleStore public bundleStore;
    ChallengesStore public challengesStore;
    KycWhitelistStore public kycWhitelistStore;
    PayoutsStore public payoutsStore;
    RolesStore public rolesStore;
    ShelteringTransfersStore public shelteringTransfersStore;
    RolesEventEmitter public rolesEventEmitter;
    TransfersEventEmitter public transfersEventEmitter;
    ChallengesEventEmitter public challengesEventEmitter;
    RewardsEventEmitter public rewardsEventEmitter;

    constructor(
        ApolloDepositStore _apolloDepositStore,
        AtlasStakeStore _atlasStakeStore,
        BundleStore _bundleStore,
        ChallengesStore _challengesStore,
        KycWhitelistStore _kycWhitelistStore,
        PayoutsStore _payoutsStore,
        RolesStore _rolesStore,
        ShelteringTransfersStore _shelteringTransfersStore,
        RolesEventEmitter _rolesEventEmitter,
        TransfersEventEmitter _transfersEventEmitter,
        ChallengesEventEmitter _challengesEventEmitter,
        RewardsEventEmitter _rewardsEventEmitter
    ) public {
        apolloDepositStore = _apolloDepositStore;
        atlasStakeStore = _atlasStakeStore;
        bundleStore = _bundleStore;
        challengesStore = _challengesStore;
        kycWhitelistStore = _kycWhitelistStore;
        payoutsStore = _payoutsStore;
        rolesStore = _rolesStore;
        shelteringTransfersStore = _shelteringTransfersStore;
        rolesEventEmitter = _rolesEventEmitter;
        transfersEventEmitter = _transfersEventEmitter;
        challengesEventEmitter = _challengesEventEmitter;
        rewardsEventEmitter = _rewardsEventEmitter;
    }
}
