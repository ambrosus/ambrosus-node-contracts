/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


const KycWhitelistWrapper = require('./dist/wrappers/kyc_whitelist_wrapper');
const RolesWrapper = require('./dist/wrappers/roles_wrapper');
const ConfigWrapper = require('./dist/wrappers/config_wrapper');

module.exports = {
  KycWhitelistWrapper,
  RolesWrapper,
  ConfigWrapper
};
