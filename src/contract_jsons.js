/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import HeadJson from './contracts/Head.json';
import ContextJson from './contracts/Context.json';
import CatalogueJson from './contracts/Catalogue.json';
import StorageCatalogueJson from './contracts/StorageCatalogue.json';
import ValidatorSetJson from './contracts/ValidatorSet.json';
import BlockRewardsJson from './contracts/BlockRewards.json';
import AtlasStakeStoreJson from './contracts/AtlasStakeStore.json';
import BundleStoreJson from './contracts/BundleStore.json';
import RolesJson from './contracts/Roles.json';
import KycWhitelistJson from './contracts/KycWhitelist.json';
import KycWhitelistStoreJson from './contracts/KycWhitelistStore.json';
import FeesJson from './contracts/Fees.json';
import ChallengesJson from './contracts/Challenges.json';
import ChallengesStoreJson from './contracts/ChallengesStore.json';
import ShelteringJson from './contracts/Sheltering.json';
import PayoutsStoreJson from './contracts/PayoutsStore.json';
import RolesStoreJson from './contracts/RolesStore.json';
import PayoutsJson from './contracts/Payouts.json';
import ShelteringTransfersJson from './contracts/ShelteringTransfers.json';
import ShelteringTransfersStoreJson from './contracts/ShelteringTransfersStore.json';
import TimeJson from './contracts/Time.json';
import ConfigJson from './contracts/Config.json';
import UploadsJson from './contracts/Uploads.json';
import ApolloDepositStoreJson from './contracts/ApolloDepositStore.json';
import ValidatorProxyJson from './contracts/ValidatorProxy.json';
import SuperSpeedConfig from './contracts/SuperSpeedConfig.json';
import SuperSpeedTime from './contracts/SuperSpeedTime.json';
import ChallengesEventEmitterJson from './contracts/ChallengesEventEmitter.json';
import RolesEventEmitterJson from './contracts/RolesEventEmitter.json';
import TransfersEventEmitterJson from './contracts/TransfersEventEmitter.json';
import MultiplexerJson from './contracts/Multiplexer.json';
import MultisigWalletJson from './contracts/MultiSigWallet.json';
import RewardsEventEmitterJson from './contracts/RewardsEventEmitter.json';

const contractJsons = {
  head: HeadJson,
  context: ContextJson,
  catalogue: CatalogueJson,
  storageCatalogue: StorageCatalogueJson,
  validatorSet: ValidatorSetJson,
  blockRewards: BlockRewardsJson,
  time: TimeJson,
  atlasStakeStore: AtlasStakeStoreJson,
  roles: RolesJson,
  bundleStore: BundleStoreJson,
  kycWhitelist: KycWhitelistJson,
  kycWhitelistStore: KycWhitelistStoreJson,
  sheltering: ShelteringJson,
  fees: FeesJson,
  challenges: ChallengesJson,
  challengesStore: ChallengesStoreJson,
  payoutsStore: PayoutsStoreJson,
  payouts: PayoutsJson,
  shelteringTransfers: ShelteringTransfersJson,
  shelteringTransfersStore: ShelteringTransfersStoreJson,
  config: ConfigJson,
  uploads: UploadsJson,
  rolesStore: RolesStoreJson,
  apolloDepositStore: ApolloDepositStoreJson,
  validatorProxy: ValidatorProxyJson,
  challengesEventEmitter: ChallengesEventEmitterJson,
  rolesEventEmitter: RolesEventEmitterJson,
  transfersEventEmitter: TransfersEventEmitterJson,
  rewardsEventEmitter: RewardsEventEmitterJson,
  multiplexer: MultiplexerJson
};

export const contractSuperSpeedJsons = {
  config: SuperSpeedConfig,
  time: SuperSpeedTime
};

export const multisig = MultisigWalletJson;

export default contractJsons;
