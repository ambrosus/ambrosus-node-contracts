/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import commandLineArgs from 'command-line-args';
import {appendEnvFile} from '../utils/file';
import config from '../../config/config';
import {multisig} from '../../src/contract_jsons';
import {
  APPROVALS_REQUIRED
} from '../constants';

export default class DeployMultisigTask extends TaskBase {
  constructor(deployActions, multiplexerWrapper) {
    super();
    this.deployActions = deployActions;
    this.multiplexerWrapper = multiplexerWrapper;
  }

  async execute(args) {
    console.log('Deploying MultiSigWallet contract.');

    const options = this.parseOptions(args);
    if (options === null) {
      return;
    }

    let approvalAdresses;
    if (config.multisigApprovalAddresses !== undefined) {
      approvalAdresses = config.multisigApprovalAddresses.split(',');
    } else {
      console.error('No validators addresses entered.');
      return;
    }
    if (options.required > approvalAdresses.length) {
      throw new Error(`There are fewer approvers than required approves (${approvalAdresses.length} provided, but required at least ${options.required}).`);
    }
    const multisigContract = await this.deployActions.deployer.deployContract(multisig, [approvalAdresses, options.required], {});
    const multiSigAddress = multisigContract.options.address;
    await this.multiplexerWrapper.contract.methods.transferOwnership(multiSigAddress).send({from: this.multiplexerWrapper.defaultAddress});
    console.log(`\tmultisig -> ${multiSigAddress}`);

    const multisigEnvLine = this.multisigToEnvFile(multisigContract);
    if (options.save) {
      await appendEnvFile(options.save, multisigEnvLine);
    }
  }

  parseOptions(args) {
    const options = commandLineArgs(
      [
        {name: 'save', type: String},
        {name: 'required', type: Number, default: APPROVALS_REQUIRED}
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

  multisigToEnvFile(multisigContract) {
    return `MULTISIG_CONTRACT_ADDRESS="${multisigContract.options.address}"\n`;
  }
}
