/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import Web3Task from './base/web3task';
import {getDefaultAddress, getDefaultGas} from '../web3_tools';
import Whitelist from '../../build/contracts/KycWhitelist';
import {getConfig} from '../config';

export default class WhitelistTask extends Web3Task {
  async execute(args) {
    await this.ensureConnectedToNode();
    if (args[0] === 'add') {
      await this.add(args[1]);
    } else if (args[0] === 'remove') {
      await this.remove(args[1]);
    } else if (args[0] === 'show') {
      await this.show(args[1]);
    } else {
      console.error('Unknown subcommand, use: yarn task whitelist [add/remove] [address]');
    }    
  }

  validateAddress(address) {
    if (!this.web3.utils.isAddress(address)) {
      throw `Invalid address: ${address}`;
    }
  }

  getWhitelistContract() {
    const contractAddress = getConfig().contracts.kycWhitelist;        
    return new this.web3.eth.Contract(Whitelist.abi, contractAddress);
  }

  async add(address) {
    this.validateAddress(address);
    const whitelist = this.getWhitelistContract();
    const from = getDefaultAddress(this.web3);
    const gas = getDefaultGas();
    await whitelist.methods.add(address).send({from, gas});
  }

  async remove(address) {
    this.validateAddress(address);
    const whitelist = this.getWhitelistContract();
    const from = getDefaultAddress(this.web3);
    const gas = getDefaultGas();
    await whitelist.methods.remove(address).send({from, gas});
  }

  async show(address) {
    this.validateAddress(address);
    const whitelist = this.getWhitelistContract();
    const from = getDefaultAddress(this.web3);
    const result = await whitelist.methods.isWhitelisted(address).call({from});
    console.log(result);
  }

  description() {
    return '[add/remove] [address] - manages list of whitelisted stakers';
  }
}
