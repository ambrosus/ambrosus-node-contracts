/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import {getDefaultAddress, getDefaultGas, createWeb3} from '../utils/web3_tools';
import ShelteringTransfers from '../../build/contracts/ShelteringTransfers';


export default class TransferTask extends TaskBase {
  async execute(args) {
    this.web3 = await createWeb3();
    const [command] = args;
    if (command === 'start') {
      await this.start(args.slice(1));
    } else if (command === 'resolve') {
      await this.resolve(args.slice(1));
    } else if (command === 'cancel') {
      await this.cancel(args.slice(1));
    } else if (command === 'list') {
      await this.list();
    } else {
      console.error('Unknown sub-command.');
      this.printUsage();
    }
  }

  printUsage() {
    console.log('\nUsage: \nyarn task transfer start [bundleId]\nyarn task transfer [resolve/cancel] [transferId]');
  }

  async start(args) {
    if (args.length !== 1) {
      console.error('Invalid parameters.');
      this.printUsage();
    } else {
      const [bundleId] = args;
      console.log(`Starting transfer of ${bundleId}`);
      await this.doStart(bundleId);
    }
  }

  async doStart(bundleId) {
    const from = getDefaultAddress(this.web3);
    const gas = getDefaultGas();
    const transfers = this.getContract(ShelteringTransfers);
    await transfers.methods.start(bundleId).send({from, gas});
  }

  async resolve(args) {
    if (args.length !== 1) {
      console.error('Invalid parameters.');
      this.printUsage();
    } else {
      const [transferId] = args;
      console.log(`Resolving transfer: ${transferId}`);
      await this.doResolve(transferId);
    }
  }

  async doResolve(transferId) {
    const from = getDefaultAddress(this.web3);
    const gas = getDefaultGas();
    const transfers = this.getContract(ShelteringTransfers);
    await transfers.methods.resolve(transferId).send({from, gas});
  }


  async cancel(args) {
    if (args.length !== 1) {
      console.error('Invalid parameters.');
      this.printUsage();
    } else {
      const [transferId] = args;
      console.log(`Canceling transfer of ${transferId}`);
      await this.doCancel(transferId);
    }
  }

  async doCancel(transferId) {
    const from = getDefaultAddress(this.web3);
    const gas = getDefaultGas();
    const transfers = this.getContract(ShelteringTransfers);
    await transfers.methods.cancel(transferId).send({from, gas});
  }

  async list() {
    const events = await this.getContract(ShelteringTransfers).getPastEvents('TransferStarted');
    console.log('transfer id                                                       : donorId                                    bundleId');
    for (const event of events) {
      const args = event.returnValues;
      console.log(`${args.transferId}: ${args.donorId} ${args.bundleId}`);
    }
  }

  description() {
    return '[start/resolve/cancel/list] [id] - manages sheltering transfers';
  }
}
