/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';

export default class BaseFeeTask extends TaskBase {
  constructor(feesWrapper) {
    super();
    this.feesWrapper = feesWrapper;
  }

  async execute([command, ...options]) {
    if (command === 'get') {
      await this.getBaseFee();
    } else if (command === 'set') {
      await this.setBaseFee(options[0]);
    } else {
      console.error('Unknown sub-command, see yarn task fee help');
      process.exit(1);
    }
  }

  async getBaseFee() {
    console.log(await this.feesWrapper.feeForUpload(1));
  }

  async setBaseFee(newBaseFee) {
    return this.feesWrapper.setBaseUploadFee(newBaseFee);
  }

  help() {
    return {
      options: '[get], [set feeInWei]',
      description: 'get and set base upload fee'
    };
  }
}
