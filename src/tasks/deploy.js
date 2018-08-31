/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import Deployer from '../deployer';
import {writeFile} from '../utils/file';

export default class DeployTask extends TaskBase {
  constructor(web3) {
    super();
    this.web3 = web3;
  }

  async execute(args) {
    console.log('Deploying contracts. This may take some time...');
    const deployer = new Deployer(this.web3);
    if (args.indexOf('--head') !== -1) {
      const headAddress = args[args.indexOf('--head') + 1];
      console.log('Reusing already deployed head.');
      await deployer.loadHead(headAddress);
    }
    const addresses = await deployer.deploy();
    const envFile = this.addressesToEnvFile(addresses);
    if (args.indexOf('--save') !== -1) {
      const envFilePath = args[args.indexOf('--save') + 1];
      this.saveEnvfile(envFilePath, envFile);
    } else {
      this.printSummary(envFile);
    }
  }

  async saveEnvfile(envFilePath, envFile) {
    try {
      await writeFile(envFilePath, envFile);
      console.log(`Contracts deployed, env saved to ${envFilePath}.`);
    } catch (err) {
      console.error(`Unable to save configuration: ${err}`);
    }
  }

  printSummary(envFile) {
    console.log(`Contracts deployed, save following environment configuration directives to start using them:`);
    console.log(envFile);
  }

  addressesToEnvFile(addresses) {
    return `export HEAD_CONTRACT_ADDRESS="${addresses.head.options.address}"`;
  }

  help() {
    return {
      description: 'deploys all contracts'
    };
  }
}
