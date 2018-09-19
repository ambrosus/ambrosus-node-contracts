/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import Deployer from '../deployer';
import contractJsons from '../contract_jsons';
import commandLineArgs from 'command-line-args';
import {writeFile} from '../utils/file';

export default class DeployTask extends TaskBase {
  constructor(web3, sender) {
    super();
    this.web3 = web3;
    this.sender = sender;
  }

  async execute(args) {
    console.log('Deploying contracts. This may take some time...');
    const deployer = new Deployer(this.web3, this.sender);
    const predeployed = {};
    const params = {};

    const options = this.parseOptions(args);
    if (options === null) {
      return;
    }

    if (options.head) {
      console.log('Reusing already deployed head contract.');
      predeployed.head = options.head;
    } else {
      params.head = {
        owner: this.sender
      };
    }

    if (options.validatorSet) {
      console.log('Reusing already deployed validator set contract.');
      predeployed.validatorSet = options.validatorSet;
    } else {
      params.validatorSet = {
        owner: this.sender,
        initialValidators : [],
        superUser: this.sender
      };
    }

    if (options.blockRewards) {
      console.log('Reusing already deployed block rewards contract.');
      predeployed.blockRewards = options.blockRewards;
    } else {
      params.blockRewards = {
        owner: this.sender,
        baseReward: '2000000000000000000',
        superUser: this.sender
      };
    }

    const contracts = await deployer.deploy(contractJsons, predeployed, [], params);
    console.log(`Contracts deployed: `);
    Object.entries(contracts).forEach(([key, contract]) => console.log(`\t${key} -> ${contract.options.address}`));

    const envFile = this.contractsToEnvFile(contracts);
    if (options.save) {
      await this.saveEnvfile(options.save, envFile);
    } else {
      this.printSummary(envFile);
    }
  }

  parseOptions(args) {
    const options = commandLineArgs(
      [
        {name: 'head', type: String},
        {name: 'validatorSet', type: String},
        {name: 'blockRewards', type: String},
        {name: 'save', type: String}
      ],
      {argv: args, partial: true}
    );
    // eslint-disable-next-line no-underscore-dangle
    const unknownOptions = options._unknown;
    if (unknownOptions && unknownOptions.length > 0) {
      console.error(`Unknown options: ${unknownOptions.join(', ')}`);
      return null;
    }

    if (options.head === null) {
      console.error(`You should provide a value for the head parameter.`);
      return null;
    }

    if (options.validatorSet === null) {
      console.error(`You should provide a value for the validatorSet parameter.`);
      return null;
    }

    if (options.blockRewards === null) {
      console.error(`You should provide a value for the blockRewards parameter.`);
      return null;
    }

    if (options.save === null) {
      console.error(`You should provide a value for the save parameter.`);
      return null;
    }

    return options;
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

  contractsToEnvFile(addresses) {
    return `HEAD_CONTRACT_ADDRESS="${addresses.head.options.address}"`;
  }

  help() {
    return {
      description: 'deploys all contracts'
    };
  }
}
