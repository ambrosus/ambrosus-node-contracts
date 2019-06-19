/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {createWeb3} from '../utils/web3_tools';
import Deployer from '../deployer';
import WhitelistTask from './whitelist';
import DeployTask from './deploy';
import DeployGenesisTask from './deploy_genesis';
import DeployMultisigTask from './deploy_multisig';
import OnboardingTask from './onboard';
import TaskList from './base/task_list';
import UploadTask from './upload';
import PayoutsTask from './payouts';
import ChallengeTask from './challenge';
import HeadWrapper from '../wrappers/head_wrapper';
import ValidatorSetWrapper from '../wrappers/validator_set_wrapper';
import BlockRewardsWrapper from '../wrappers/block_rewards_wrapper';
import ValidatorProxyWrapper from '../wrappers/validator_proxy_wrapper';
import RolesWrapper from '../wrappers/roles_wrapper';
import UploadsWrapper from '../wrappers/uploads_wrapper';
import FeesWrapper from '../wrappers/fees_wrapper';
import KycWhitelistWrapper from '../wrappers/kyc_whitelist_wrapper';
import DeployActions from '../actions/deploy_actions';
import WhitelistActions from '../actions/whitelist_actions';
import OnboardActions from '../actions/onboard_actions';
import UploadActions from '../actions/upload_actions';
import config from '../../config/config';
import ShelteringWrapper from '../wrappers/sheltering_wrapper';
import NodeServiceTask from './node_service';
import NodeServiceActions from '../actions/node_service';
import PayoutsActions from '../actions/payouts_actions';
import AdministrativeActions from '../actions/admin_actions';
import TimeWrapper from '../wrappers/time_wrapper';
import PayoutsWrapper from '../wrappers/payouts_wrapper';
import ChallengeActions from '../actions/challenge_actions';
import ChallengeWrapper from '../wrappers/challenge_wrapper';
import BlockchainStateWrapper from '../wrappers/blockchain_state_wrapper';
import ChallengesEventEmitterWrapper from '../wrappers/challenges_event_emitter_wrapper';
import AtlasStakeStoreWrapper from '../wrappers/atlas_stake_store_wrapper';
import RetiringTask from './retire';
import MoveOwnershipToMultiplexerTask from './move_ownership_to_multiplexer';
import MultiplexerWrapper from '../wrappers/multiplexer_wrapper';
import MoveOwnershipFromMultiplexerTask from './move_ownership_from_multiplexer';
import CheckOwnershipTask from './ownership';
import MultisigActions from '../actions/multisig_actions';
import MultisigWrapper from '../wrappers/multisig_wrapper';
import MultisigFunctions from '../utils/multisig_functions';
import MultisigOwnersTask from './multisig_owners';
import BaseFeeTask from './base_fee';


const runTask = async () => {
  const web3 = await createWeb3();
  const nodeAddress = web3.eth.accounts.privateKeyToAccount(config.nodePrivateKey).address;
  const deployer = new Deployer(web3, nodeAddress);

  const headWrapper = new HeadWrapper(config.headContractAddress, web3, nodeAddress);
  const validatorSetWrapper = new ValidatorSetWrapper(config.validatorSetContractAddress, web3);
  const blockRewardsWrapper = new BlockRewardsWrapper(config.blockRewardsContractAddress, web3);
  const validatorProxyWrapper = new ValidatorProxyWrapper(headWrapper, web3, nodeAddress);
  const rolesWrapper = new RolesWrapper(headWrapper, web3, nodeAddress);
  const uploadsWrapper = new UploadsWrapper(headWrapper, web3, nodeAddress);
  const feesWrapper = new FeesWrapper(headWrapper, web3, nodeAddress);
  const kycWhitelistWrapper = new KycWhitelistWrapper(headWrapper, web3, nodeAddress);
  const shelteringWrapper = new ShelteringWrapper(headWrapper, web3, nodeAddress);
  const timeWrapper = new TimeWrapper(headWrapper, web3, nodeAddress);
  const payoutsWrapper = new PayoutsWrapper(headWrapper, web3, nodeAddress);
  const challengeWrapper = new ChallengeWrapper(headWrapper, web3, nodeAddress);
  const challengesEventEmitterWrapper = new ChallengesEventEmitterWrapper(headWrapper, web3, nodeAddress);
  const blockchainStateWrapper = new BlockchainStateWrapper(web3);
  const atlasStakeStoreWrapper = new AtlasStakeStoreWrapper(headWrapper, web3, nodeAddress);
  const multiplexerWrapper = new MultiplexerWrapper(config.multiplexerContractAddress, web3, nodeAddress);
  const multisigWrapper = new MultisigWrapper(config.multisigContractAddress, web3, nodeAddress);

  const deployActions = new DeployActions(deployer, headWrapper, validatorSetWrapper, blockRewardsWrapper, validatorProxyWrapper);
  const whitelistActions = new WhitelistActions(kycWhitelistWrapper);
  const onboardActions = new OnboardActions(kycWhitelistWrapper, rolesWrapper, atlasStakeStoreWrapper);
  const uploadActions = new UploadActions(uploadsWrapper, feesWrapper, shelteringWrapper, blockchainStateWrapper, challengesEventEmitterWrapper);
  const nodeServiceActions = new NodeServiceActions(rolesWrapper);
  const payoutsActions = new PayoutsActions(timeWrapper, payoutsWrapper);
  const challengeActions = new ChallengeActions(challengeWrapper, feesWrapper, shelteringWrapper, blockchainStateWrapper, atlasStakeStoreWrapper);
  const adminActions = new AdministrativeActions(headWrapper, kycWhitelistWrapper, feesWrapper, validatorProxyWrapper, blockchainStateWrapper);
  const multisigActions = new MultisigActions(multisigWrapper, multiplexerWrapper, new MultisigFunctions(web3));

  const list = new TaskList();
  const args = process.argv.slice(2);
  list.add('deployGenesis', new DeployGenesisTask(web3, deployActions));
  list.add('deploy', new DeployTask(deployActions));
  list.add('deployMultisig', new DeployMultisigTask(deployActions, multiplexerWrapper));
  list.add('onboard', new OnboardingTask(web3, nodeAddress, onboardActions));
  list.add('whitelist', new WhitelistTask(web3, whitelistActions, onboardActions));
  list.add('upload', new UploadTask(uploadActions));
  list.add('nodeService', new NodeServiceTask(nodeAddress, nodeServiceActions));
  list.add('payouts', new PayoutsTask(web3, nodeAddress, payoutsActions));
  list.add('challenge', new ChallengeTask(challengeActions));
  list.add('retire', new RetiringTask(onboardActions));
  list.add('moveOwnershipToMultiplexer', new MoveOwnershipToMultiplexerTask(adminActions));
  list.add('moveOwnershipFromMultiplexer', new MoveOwnershipFromMultiplexerTask(multisigActions));
  list.add('checkOwnership', new CheckOwnershipTask(web3));
  list.add('multisigOwners', new MultisigOwnersTask(multisigWrapper));
  list.add('fee', new BaseFeeTask(feesWrapper));

  await list.run(args[0], args.slice(1));
};

runTask()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
