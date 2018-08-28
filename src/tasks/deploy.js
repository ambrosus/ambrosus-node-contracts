/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import Deployer from '../deployer';
import {createWeb3} from '../web3_tools';
import {getConfig, getConfigFilePath, getConfigFilePathFromRoot} from '../config';
import {writeFile} from '../utils/file';

export default class DeployTask extends TaskBase {
  async execute(args) {
    console.log('Deploying contracts. This may take some time...');
    this.web3 = await createWeb3();
    await this.printAccountInfo();
    const deployer = new Deployer(this.web3);
    if (args.indexOf('--head') !== -1) {
      const headAddress = args[args.indexOf('--head') + 1];
      await deployer.loadHead(headAddress);
    }
    const addresses = await deployer.deploy();
    const config = this.addressesToConfig(addresses);
    if (args.indexOf('--save-config') !== -1) {
      this.saveConfiguration(config);
    } else {
      this.printSummary(config);
    }
  }

  async printAccountInfo() {
    const accounts = await this.web3.eth.getAccounts();
    for (const account of accounts) {
      const balance = await this.web3.eth.getBalance(account);
      const balanceInEth = this.web3.utils.fromWei(balance);
      console.log(`${account}: ${balanceInEth} ETH`);
    }
  }

  async saveConfiguration(config) {
    const filePath = getConfigFilePathFromRoot();
    try {
      await writeFile(filePath, JSON.stringify(config, null, 2));
      console.log(`Contracts deployed, configuration saved to ${filePath}.`);
    } catch (err) {
      console.error(`Unable to save configuration: ${err}`);
    }
  }

  printSummary(config) {
    console.log(`Contracts deployed, save following configuration to ${getConfigFilePath()} to start using them:`);
    console.log(config);
  }

  addressesToConfig(addresses) {
    const contracts = Object.keys(addresses)
      .map((key) => [key, addresses[key].options.address])
      .reduce((object, [key, value]) => {
        object[key] = value;
        return object;
      }, {});
    return {...getConfig(), contracts};
  }

  description() {
    return '                                   - deploys all contracts';
  }
}
