/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {createWeb3} from '../utils/web3_tools';
import WhitelistTask from './whitelist';
import DeployTask from './deploy';
import OnboardingTask from './onboard';
import TaskList from './base/task_list';
import UploadTask from './upload';
import HeadWrapper from '../wrappers/head_wrapper';
import RolesWrapper from '../wrappers/roles_wrapper';
import UploadsWrapper from '../wrappers/uploads_wrapper';
import FeesWrapper from '../wrappers/fees_wrapper';
import KycWhitelistWrapper from '../wrappers/kyc_whitelist_wrapper';
import WhitelistActions from '../actions/whitelist_actions';
import OnboardActions from '../actions/onboard_actions';
import UploadActions from '../actions/upload_actions';
import config from '../../config/config';

const runTask = async () => {
  const web3 = await createWeb3();
  const nodeAddress = web3.eth.accounts.privateKeyToAccount(config.nodePrivateKey).address;

  const headWrapper = new HeadWrapper(config.headContractAddress, web3, nodeAddress);
  const rolesWrapper = new RolesWrapper(headWrapper, web3, nodeAddress);
  const uploadsWrapper = new UploadsWrapper(headWrapper, web3, nodeAddress);
  const feesWrapper = new FeesWrapper(headWrapper, web3, nodeAddress);
  const kycWhitelistWrapper = new KycWhitelistWrapper(headWrapper, web3, nodeAddress);

  const whitelistActions = new WhitelistActions(kycWhitelistWrapper);
  const onboardActions = new OnboardActions(kycWhitelistWrapper, rolesWrapper);
  const uploadActions = new UploadActions(uploadsWrapper, feesWrapper);

  const list = new TaskList();
  const args = process.argv.slice(2);
  list.add('deploy', new DeployTask(web3, nodeAddress));
  list.add('onboard', new OnboardingTask(web3, nodeAddress, onboardActions));
  list.add('whitelist', new WhitelistTask(web3, whitelistActions));
  list.add('upload', new UploadTask(uploadActions));

  await list.run(args[0], args.slice(1));
};

runTask()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
