/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {createWeb3} from '../utils/web3_tools';
import WhitelistTask from './whitelist';
import DeployTask from './deploy';
import GanacheTask from './ganache';
import OnboardingTask from './onboard';
import TaskList from './base/task_list';
import UploadTask from './upload';
import ContractManager from '../wrappers/contract_manager';
import config from '../../config/config';

const runTask = async () => {
  const web3 = await createWeb3();
  const contractManager = new ContractManager(web3, config.headContractAddress);
  const list = new TaskList();
  const args = process.argv.slice(2);
  list.add('ganache', new GanacheTask());
  list.add('deploy', new DeployTask(web3));
  list.add('onboard', new OnboardingTask(web3, contractManager));
  list.add('whitelist', new WhitelistTask(web3, contractManager));
  list.add('upload', new UploadTask(contractManager));
  await list.run(args[0], args.slice(1));
};

runTask()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
