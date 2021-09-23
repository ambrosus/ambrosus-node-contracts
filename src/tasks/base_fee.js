/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

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
    } else if (command === 'getDeveloper') {
      await this.getDeveloper();
    } else if (command === 'setDeveloper') {
      await this.setDeveloper(options[0]);
    } else if (command === 'getDeveloperFee') {
      await this.getDeveloperFee();
    } else if (command === 'setDeveloperFee') {
      await this.setDeveloperFee(options[0]);
    } else if (command === 'getDeveloperUploadFee') {
      await this.getDeveloperUploadFee();
    } else if (command === 'setDeveloperUploadFee') {
      await this.setDeveloperUploadFee(options[0]);
    } else if (command === 'getAdmins') {
      await this.getAdmins();
    } else if (command === 'setAdmins') {
      for (const admin of options) {
        await this.addAdmin(admin);
      }
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

  async getDeveloper() {
    try {
      console.log(await this.feesWrapper.getDeveloper());
    } catch (error) {
      console.log('0x0');
    }
  }

  async setDeveloper(developer) {
    if (!developer) {
      return;
    }
    return this.feesWrapper.setDeveloper(developer);
  }

  async getDeveloperFee() {
    try {
      console.log(await this.feesWrapper.getDeveloperFee());
    } catch (error) {
      console.log('0');
    }
  }

  async setDeveloperFee(fee) {
    if (!fee) {
      return;
    }
    return this.feesWrapper.setDeveloperFee(fee);
  }

  async getDeveloperUploadFee() {
    try {
      console.log(await this.feesWrapper.getDeveloperUploadFee());
    } catch (error) {
      console.log('0');
    }
  }

  async setDeveloperUploadFee(fee) {
    if (!fee) {
      return;
    }
    return this.feesWrapper.setDeveloperUploadFee(fee);
  }

  async getAdmins() {
    try {
      console.log((await this.feesWrapper.getAdmins()).join(','));
    } catch (error) {
      console.log('');
    }
  }

  async addAdmin(admin) {
    if (!admin) {
      return;
    }
    return this.feesWrapper.addAdmin(admin);
  }

  help() {
    return {
      options: '[get], [set feeInWei]',
      description: 'get and set base upload fee'
    };
  }
}
