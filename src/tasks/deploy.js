/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import Deployer from '../deployer';
import commandLineArgs from 'command-line-args';
import {writeFile} from '../utils/file';
import DeployActions from '../actions/deploy_actions';

export default class DeployTask extends TaskBase {
  constructor(web3, sender) {
    super();
    this.web3 = web3;
    this.sender = sender;
    this.deployActions = new DeployActions(new Deployer(this.web3, this.sender));
  }

  async execute(args) {
    console.log('Deploying contracts. This may take some time...');
    const options = this.parseOptions(args);
    if (options === null) {
      return;
    }
    let {head, validatorSet, blockRewards} = options;

    if (options.genesis) {
      const initialValidators = Array(3)
        .fill(null)
        .map(() => this.web3.eth.accounts.create().address);
      console.log(`Initial validators are: ${initialValidators}`);
      console.log('Deploying genesis contracts');
      const genesisContracts = await this.deployActions.deployGenesis(initialValidators);
      console.log(`Genesis deployed: `);
      this.prettyPrintAddresses(genesisContracts);
      head = genesisContracts.head.options.address;
      validatorSet = genesisContracts.validatorSet.options.address;
      blockRewards = genesisContracts.blockRewards.options.address;
    }

    if (options.turbo) {
      console.log('⚡️ Deploying in super speed mode. ⚡️');
    }

    const contracts = await this.deployActions.deployAll(head, validatorSet, blockRewards, options.turbo);
    console.log(`Contracts deployed: `);
    this.prettyPrintAddresses(contracts);

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
        {name: 'genesis', type: Boolean},
        {name: 'head', type: String},
        {name: 'validatorSet', type: String},
        {name: 'blockRewards', type: String},
        {name: 'turbo', type: Boolean},
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

    if (!options.genesis && !options.head) {
      console.error(`You should provide a value for the head parameter.`);
      return null;
    }

    if (!options.genesis && !options.validatorSet) {
      console.error(`You should provide a value for the validatorSet parameter.`);
      return null;
    }

    if (!options.genesis && !options.blockRewards) {
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

  prettyPrintAddresses(contracts) {
    return Object.entries(contracts).forEach(([key, contract]) => console.log(`\t${key} -> ${contract.options.address}`));
  }

  printSummary(envFile) {
    console.log(`Contracts deployed, save following environment configuration directives to start using them:`);
    console.log(envFile);
  }

  contractsToEnvFile(addresses) {
    return `HEAD_CONTRACT_ADDRESS="${addresses.head.options.address}"
VALIDATOR_SET_CONTRACT_ADDRESS="${addresses.validatorSet.options.address}"
BLOCK_REWARDS_CONTRACT_ADDRESS="${addresses.blockRewards.options.address}"`;
  }

  help() {
    return {
      description: 'deploys all contracts'
    };
  }
}
