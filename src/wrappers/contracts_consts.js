/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ApolloDepositStoreJson from '../../build/contracts/ApolloDepositStore.json';
import AtlasStakeStoreJson from '../../build/contracts/AtlasStakeStore.json';
import BundleStoreJson from '../../build/contracts/BundleStore.json';
import ChallengesJson from '../../build/contracts/Challenges.json';
import ConfigJson from '../../build/contracts/Config.json';
import FeesJson from '../../build/contracts/Fees.json';
import KycWhitelistJson from '../../build/contracts/KycWhitelist.json';
import PayoutsJson from '../../build/contracts/Payouts.json';
import PayoutsStoreJson from '../../build/contracts/PayoutsStore.json';
import RolesJson from '../../build/contracts/Roles.json';
import RolesStoreJson from '../../build/contracts/RolesStore.json';
import ShelteringJson from '../../build/contracts/Sheltering.json';
import ShelteringTransfersJson from '../../build/contracts/ShelteringTransfers.json';
import TimeJson from '../../build/contracts/Time.json';
import UploadsJson from '../../build/contracts/Uploads.json';
import ContextJson from '../../build/contracts/Context.json';
import HeadJson from '../../build/contracts/Head.json';
import SafeMathExtensionsJson from '../../build/contracts/SafeMathExtensions.json';

const contractsJsons = {
  time: TimeJson,
  atlasStakeStore: AtlasStakeStoreJson,
  roles: RolesJson,
  bundleStore: BundleStoreJson,
  kycWhitelist: KycWhitelistJson,
  sheltering: ShelteringJson,
  fees: FeesJson,
  challenges: ChallengesJson,
  payoutsStore: PayoutsStoreJson,
  payouts: PayoutsJson,
  shelteringTransfers: ShelteringTransfersJson,
  config: ConfigJson,
  uploads: UploadsJson,
  rolesStore: RolesStoreJson,
  apolloDepositStore: ApolloDepositStoreJson
};

const serviceContractsJsons = {
  head: HeadJson,
  context: ContextJson,
  safeMathExtensions: SafeMathExtensionsJson
};

const MIN_BLOCK_TIME = 5; // seconds

export {contractsJsons, serviceContractsJsons, MIN_BLOCK_TIME};
