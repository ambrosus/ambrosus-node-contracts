/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "../Boilerplate/Context.sol";


contract MockContext is Context {
    mapping(address => bool) whitelist;

    constructor(
        Time _time,
        AtlasStakeStore _atlasStakeStore,
        BundleStore _bundleStore,
        KycWhitelist _kycWhitelist,
        Roles _roles,
        Sheltering _sheltering,
        Fees _fees,
        Challenges _challenges,
        PayoutsStore _payoutsStore,
        Payouts _payouts,
        ShelteringTransfers _shelteringTransfers,
        Config _config,
        Uploads _uploads,
        RolesStore _rolesStore,
        ApolloDepositStore _apolloDepositStore,
        ValidatorProxy _validatorProxy
    ) Context(
        _time,
        _atlasStakeStore,
        _bundleStore,
        _kycWhitelist,
        _roles,
        _sheltering,
        _fees,
        _challenges,
        _payoutsStore,
        _payouts,
        _shelteringTransfers,
        _config,
        _uploads,
        _rolesStore,
        _apolloDepositStore,
        _validatorProxy
    ) public {        
    }

    function addToWhitelist(address[] whitelisted) public {
        for (uint i = 0; i < whitelisted.length; i++) {
            whitelist[whitelisted[i]] = true;
        }
    }

    function removeFromWhitelist(address[] unWhitelisted) public {
        for (uint i = 0; i < unWhitelisted.length; i++) {
            whitelist[unWhitelisted[i]] = false;
        }
    }

    function isInternalToContext(address contractAddress) view public returns (bool) {
        return super.isInternalToContext(contractAddress) || whitelist[contractAddress];
    }
}
