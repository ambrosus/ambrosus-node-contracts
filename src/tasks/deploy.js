/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import commandLineArgs from 'command-line-args';
import {appendFile} from '../utils/file';

export default class DeployTask extends TaskBase {
  constructor(deployActions) {
    super();
    this.deployActions = deployActions;
  }

  async execute(args) {
    const [command, ...remainingArgs] = args;
    if (command === 'initial') {
      await this.deploy(true, remainingArgs);
    } else if (command === 'update') {
      await this.deploy(false, remainingArgs);
    } else {
      console.error('Unknown sub-command, use: yarn task deploy [initial/update]');
      process.exit(1);
    }
  }

  async deploy(initial, args) {
    console.log(`Deploying ${initial ? 'initial set of contracts' : 'contracts update'}. This may take some time...`);
    const options = this.parseOptions(args);

    if (options.turbo) {
      console.log('⚡️ Deploying in super speed mode. ⚡️');
    }

    let contracts;
    if (initial) {
      contracts = await this.deployActions.deployInitial(options.turbo);
    } else {
      contracts = await this.deployActions.deployUpdate(options.turbo);
    }
    console.log(`Current contract set: `);
    this.prettyPrintAddresses(contracts);

    const multiplexerEnvLine = this.multiplexerToEnvFile(contracts.multiplexer);
    if (options.save) {
      await appendFile(options.save, multiplexerEnvLine);
    }
  }

  multiplexerToEnvFile(multiplexerContract) {
    return `MULTIPLEXER_CONTRACT_ADDRESS="${multiplexerContract.options.address}"\n`;
  }

  parseOptions(args) {
    const options = commandLineArgs(
      [
        {name: 'turbo', type: Boolean},
        {name: 'save', type: String}
      ],
      {argv: args, partial: true}
    );
    // eslint-disable-next-line no-underscore-dangle
    const unknownOptions = options._unknown;
    if (unknownOptions && unknownOptions.length > 0) {
      console.error(`Unknown options: ${unknownOptions.join(', ')}`);
      process.exit(1);
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

  help() {
    return {
      description: 'deploys contracts'
    };
  }
}
