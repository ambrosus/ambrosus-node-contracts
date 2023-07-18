/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

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
import "../Pool/PoolsNodesManager.sol";

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
import "../Storage/PoolsStore.sol";
import "../Storage/PoolEventsEmitter.sol";
import "../Storage/NodeAddressesStore.sol";
import "../Storage/RolesPrivilagesStore.sol";

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
    PoolsNodesManager public poolsNodesManager;

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
        ValidatorProxy _validatorProxy,
        PoolsNodesManager _poolsNodesManager
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
        poolsNodesManager = _poolsNodesManager;
    }

    function change(address _from, address _to) public {
        require(fees.isAdmin(msg.sender));
        if (_from == address(kycWhitelist)) {
            kycWhitelist = KycWhitelist(_to);
        } else if (_from == address(roles)) {
            roles = Roles(_to);
        } else if (_from == address(fees)) {
            fees = Fees(_to);
        } else if (_from == address(challenges)) {
            challenges = Challenges(_to);
        } else if (_from == address(payouts)) {
            payouts = Payouts(_to);
        } else if (_from == address(shelteringTransfers)) {
            shelteringTransfers = ShelteringTransfers(_to);
        } else if (_from == address(sheltering)) {
            sheltering = Sheltering(_to);
        } else if (_from == address(uploads)) {
            uploads = Uploads(_to);
        } else if (_from == address(config)) {
            config = Config(_to);
        } else if (_from == address(validatorProxy)) {
            validatorProxy = ValidatorProxy(_to);
        } else if (_from == address(time)) {
            time = Time(_to);
        } else if (_from == address(poolsNodesManager)) {
            poolsNodesManager = PoolsNodesManager(_to);
        }
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
    PoolsStore public poolsStore;
    PoolEventsEmitter public poolEventsEmitter;
    NodeAddressesStore public nodeAddressesStore;
    RolesPrivilagesStore public rolesPrivilagesStore;

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
        RewardsEventEmitter _rewardsEventEmitter,
        PoolsStore _poolsStore,
        PoolEventsEmitter _poolEventsEmitter,
        NodeAddressesStore _nodeAddressesStore,
        RolesPrivilagesStore _rolesPrivilagesStore
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
        poolsStore = _poolsStore;
        poolEventsEmitter = _poolEventsEmitter;
        nodeAddressesStore = _nodeAddressesStore;
        rolesPrivilagesStore = _rolesPrivilagesStore;
    }
}
