/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';


export default class UploadTask extends TaskBase {
  constructor(contractManager) {
    super();
    this.contractManager = contractManager;
  }

  async execute(args) {
    if (args.length !== 2) {
      console.error('Invalid parameters.');
      this.printUsage();
    } else {
      console.log('Uploading empty bundle...');
      await this.uploadBundle(args[0], args[1]);
    }
  }

  async uploadBundle(bundleId, storagePeriods) {
    const {uploadsWrapper, feesWrapper} = this.contractManager;
    const value = await feesWrapper.feeForUpload(storagePeriods);
    await uploadsWrapper.registerBundle(bundleId, value, storagePeriods);
  }

  printUsage() {
    console.log('\nUsage: \nyarn task upload [bundleId] [storagePeriod]');
  }

  help() {
    return {
      options: '[bundleId] [storagePeriods]',
      description: 'uploads empty bundle (for testing purposes mainly)'
    };
  }
}
