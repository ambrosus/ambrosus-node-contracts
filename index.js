/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


const ChallengesWrapper = require('./dist/wrappers/challenges_wrapper').default;
const ConfigWrapper = require('./dist/wrappers/config_wrapper').default;
const FeesWrapper = require('./dist/wrappers/fees_wrapper').default;
const HeadWrapper = require('./dist/wrappers/head_wrapper').default;
const KycWhitelistWrapper = require('./dist/wrappers/kyc_whitelist_wrapper').default;
const RolesWrapper = require('./dist/wrappers/roles_wrapper').default;
const ShelteringWrapper = require('./dist/wrappers/sheltering_wrapper').default;
const UploadsWrapper = require('./dist/wrappers/uploads_wrapper').default;
const constants = require('./dist/consts');

module.exports = {
  ChallengesWrapper,
  ConfigWrapper,
  FeesWrapper,
  HeadWrapper,
  KycWhitelistWrapper,
  RolesWrapper,
  ShelteringWrapper,
  UploadsWrapper,
  constants
};
