/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import {ROLE_CODES} from '../consts';

export default class WhitelistTask extends TaskBase {
  constructor(web3, whitelistActions) {
    super();
    this.web3 = web3;
    this.whitelistActions = whitelistActions;
  }

  async execute(args) {
    const [command] = args;
    if (command === 'add') {
      await this.add(args[1], args[2], args[3]);
    } else if (command === 'remove') {
      await this.remove(args[1]);
    } else if (command === 'check') {
      await this.show(args[1]);
    } else {
      console.error('Unknown sub-command, use: yarn task whitelist [add/remove] [address] [role] [requiredDeposit]');
    }
  }

  validateAddress(address) {
    if (!this.web3.utils.isAddress(address)) {
      throw `Invalid address: ${address}`;
    }
  }

  async add(address, role, requiredDeposit) {
    try {
      this.validateAddress(address);
      await this.whitelistActions.add(address, ROLE_CODES[role], requiredDeposit);
    } catch (err) {
      console.error(err.message);
    }
  }

  async remove(address) {
    try {
      this.validateAddress(address);
      await this.whitelistActions.remove(address);
    } catch (err) {
      console.error(err.message);
    }
  }

  help() {
    return {
      options: '[add/remove] [address]',
      desciption: 'manages list of whitelisted node candidates'
    };
  }
}
