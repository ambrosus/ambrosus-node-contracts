/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import {getDefaultAddress, getDefaultGas, createWeb3} from '../web3_tools';
import Uploads from '../../build/contracts/Uploads';
import Fees from '../../build/contracts/Fees';

export default class UploadTask extends TaskBase {  
  async getFee(storagePeriods) {
    return this.getContract(Fees).methods.getFeeForUpload(storagePeriods).call();
  }

  async execute(args) {
    if (args.length !== 2) {
      console.error('Invalid parameters.');
      this.printUsage();
    } else {
      console.log('Uploading empty bundle...');
      this.uploadBundle(args[0], args[1]);
    }
  }

  async uploadBundle(bundleId, storagePeriods) {    
    this.web3 = await createWeb3();
    const from = getDefaultAddress(this.web3);
    const gas = getDefaultGas();
    const value = await this.getFee(storagePeriods);
    this.uploadContract = this.getContract(Uploads);
    await this.uploadContract.methods.registerBundle(bundleId, storagePeriods)
      .send({from, gas, value});
  }

  printUsage() {
    console.log('\nUsage: \nyarn task upload [bundleId] [storagePeriod]');
  }

  description() {
    return '[bundleId] [storagePeriods]        - uploads empty bundle (for testing purposes mainly)';
  }
}
