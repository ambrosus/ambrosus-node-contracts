/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import {ROLE_CODES, ROLE_REVERSE_CODES} from '../constants';

export default class WhitelistTask extends TaskBase {
  constructor(web3, whitelistActions, onboardActions) {
    super();
    this.web3 = web3;
    this.whitelistActions = whitelistActions;
    this.onboardActions = onboardActions;
  }

  async execute(args) {
    const [command] = args;
    if (command === 'add') {
      await this.add(args[1], args[2], args[3]);
    } else if (command === 'remove') {
      await this.remove(args[1]);
    } else if (command === 'get') {
      await this.get(args[1]);
    } else {
      console.error('Unknown sub-command, use: yarn task whitelist [add/remove] [address] [role] [requiredDeposit]');
      process.exit(1);
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
      const deposit = this.web3.utils.toWei(requiredDeposit, 'ether');
      await this.whitelistActions.add(address, ROLE_CODES[role], deposit);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }

  async remove(address) {
    try {
      this.validateAddress(address);
      await this.whitelistActions.remove(address);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }

  async get(address) {
    try {
      this.validateAddress(address);
      const whitelisted = await this.whitelistActions.get(address);
      console.log(`Address ${address} is whitelisted for the ${ROLE_REVERSE_CODES[whitelisted.role]} role with ${this.web3.utils.fromWei(whitelisted.requiredDeposit, 'ether')} AMB deposit/stake`);
      const onboardedRole = await this.onboardActions.getOnboardedRole(address);
      console.log(`Address ${address} is onboarded for the ${ROLE_REVERSE_CODES[onboardedRole.role]} role with url: ${onboardedRole.url}`);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }

  help() {
    return {
      options: '[add/remove/get] [address]',
      description: 'manages list of whitelisted node candidates'
    };
  }
}
