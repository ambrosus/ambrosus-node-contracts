/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import commandLineArgs from 'command-line-args';
import {appendEnvFile} from '../utils/file';

export default class DeployGenesisTask extends TaskBase {
  constructor(web3, deployActions) {
    super();
    this.web3 = web3;
    this.deployActions = deployActions;
  }

  async execute(args) {
    console.log('Deploying genesis contracts. This may take some time...');

    const options = this.parseOptions(args);
    if (options === null) {
      return;
    }

    const initialValidators = Array(3)
      .fill(null)
      .map(() => this.web3.eth.accounts.create().address);
    console.log(`Initial validators are: ${initialValidators}`);

    const genesisContracts = await this.deployActions.deployGenesis(initialValidators);
    console.log(`Genesis deployed: `);
    this.prettyPrintAddresses(genesisContracts);

    const envFile = this.contractsToEnvFile(genesisContracts);
    if (options.save) {
      await appendEnvFile(options.save, envFile);
    } else {
      this.printSummary(envFile);
    }
  }

  parseOptions(args) {
    const options = commandLineArgs(
      [
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

    if (options.save === null) {
      console.error(`You should provide a value for the save parameter.`);
      return null;
    }

    return options;
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
BLOCK_REWARDS_CONTRACT_ADDRESS="${addresses.blockRewards.options.address}"
`;
  }

  help() {
    return {
      description: 'deploys genesis contracts'
    };
  }
}
