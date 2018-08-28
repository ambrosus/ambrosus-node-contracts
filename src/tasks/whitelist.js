/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import {getDefaultAddress, getDefaultGas, createWeb3} from '../web3_tools';
import KycWhitelist from '../../build/contracts/KycWhitelist';
import {ROLE_CODES} from '../consts';

export default class WhitelistTask extends TaskBase {
  async execute(args) {
    this.web3 = await createWeb3();
    const [command] = args;
    if (command === 'add') {
      await this.add(args[1], args[2], args[3]);
    } else if (command === 'remove') {
      await this.remove(args[1]);
    } else if (command === 'check') {
      await this.show(args[1]);
    } else {
      console.error('Unknown sub-command, use: yarn task whitelist [add/remove/check] [address]');
    }
  }

  validateAddress(address) {
    if (!this.web3.utils.isAddress(address)) {
      throw `Invalid address: ${address}`;
    }
  }

  async add(address, role, requiredDeposit) {
    this.validateAddress(address);
    const whitelist = this.getContract(KycWhitelist);
    const from = getDefaultAddress(this.web3);
    const gas = getDefaultGas();
    await whitelist.methods.add(address, ROLE_CODES[role], requiredDeposit).send({from, gas});
  }

  async remove(address) {
    this.validateAddress(address);
    const whitelist = this.getContract(KycWhitelist);
    const from = getDefaultAddress(this.web3);
    const gas = getDefaultGas();
    await whitelist.methods.remove(address).send({from, gas});
  }

  async show(address) {
    this.validateAddress(address);
    const whitelist = this.getContract(KycWhitelist);
    const from = getDefaultAddress(this.web3);
    const result = await whitelist.methods.isWhitelisted(address).call({from});
    console.log(result);
  }

  description() {
    return '[add/remove/check] [address]    - manages list of whitelisted stakers';
  }
}
