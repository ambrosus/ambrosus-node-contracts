/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import HeadJson from '../build/contracts/Head.json';
import ContextJson from '../build/contracts/Context.json';
import ValidatorSetJson from '../build/contracts/ValidatorSet.json';
import BlockRewardsJson from '../build/contracts/BlockRewards.json';
import AtlasStakeStoreJson from '../build/contracts/AtlasStakeStore.json';
import BundleStoreJson from '../build/contracts/BundleStore.json';
import RolesJson from '../build/contracts/Roles.json';
import KycWhitelistJson from '../build/contracts/KycWhitelist.json';
import FeesJson from '../build/contracts/Fees.json';
import ChallengesJson from '../build/contracts/Challenges.json';
import ShelteringJson from '../build/contracts/Sheltering.json';
import PayoutsStoreJson from '../build/contracts/PayoutsStore.json';
import RolesStoreJson from '../build/contracts/RolesStore.json';
import PayoutsJson from '../build/contracts/Payouts.json';
import ShelteringTransfersJson from '../build/contracts/ShelteringTransfers.json';
import TimeJson from '../build/contracts/Time.json';
import ConfigJson from '../build/contracts/Config.json';
import UploadsJson from '../build/contracts/Uploads.json';
import ApolloDepositStoreJson from '../build/contracts/ApolloDepositStore.json';
import ValidatorProxyJson from '../build/contracts/ValidatorProxy.json';

const DEFAULT_CONTRACT_JSONS = {
  head: HeadJson,
  context: ContextJson,
  validatorSet: ValidatorSetJson,
  blockRewards: BlockRewardsJson,
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
  apolloDepositStore: ApolloDepositStoreJson,
  validatorProxy: ValidatorProxyJson
};

export default DEFAULT_CONTRACT_JSONS;
