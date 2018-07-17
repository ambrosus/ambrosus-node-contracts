/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BN from 'bn.js';
import TaskBase from './base/task_base';
import {getDefaultAddress, getDefaultGas, createWeb3} from '../web3_tools';
import Stakes from '../../build/contracts/Stakes';
import {getConfig} from '../config';
import Whitelist from '../../build/contracts/KycWhitelist';
import {ATLAS, HERMES, APOLLO, ATLAS1_STAKE, ATLAS2_STAKE, ATLAS3_STAKE, HERMES_STAKE, APOLLO_STAKE} from '../consts';

export default class StakeTask extends TaskBase {
  async execute(args) {
    this.web3 = await createWeb3();
    const [command] = args;
    if (command === 'deposit') {
      await this.deposit(args.slice(1));
    } else if (command === 'release') {
      await this.release();
    } else if (command === 'show') {
      await this.show();
    } else {
      console.error('Unknown sub-command.');
      this.printUsage();
    }    
  }

  printUsage() {
    const {fromWei} = this.web3.utils;
    console.log('\nUsage: yarn task stake [deposit/release/check] [role] [amount]');
    console.log('Available roles and stakes are:');    
    console.log(`${ATLAS} - ATLAS  (stakes: ${fromWei(ATLAS1_STAKE)}, ${fromWei(ATLAS2_STAKE)}, ${fromWei(ATLAS3_STAKE)} AMB)`);
    console.log(`${HERMES} - HERMES (stakes: ${fromWei(HERMES_STAKE)} AMB)`);
    console.log(`${APOLLO} - APOLLO (stakes: ${fromWei(APOLLO_STAKE)} AMB)`);
  }

  async deposit(args) {
    if (args.length !== 2) {
      console.error('Invalid parameters.');
      this.printUsage();
    } else {
      await this.doDeposit(args[0], args[1]);
    }
  }

  async doDeposit(role, amount) {        
    const value = this.web3.utils.toWei(new BN(amount));
    const stakes = this.getContract(Stakes);
    const from = getDefaultAddress(this.web3);    
    await this.validateOnWhitelist(from);
    const gas = getDefaultGas();
    await stakes.methods.depositStake(new BN(role)).send({from, gas, value});
  }

  getWhitelistContract() {
    const contractAddress = getConfig().contracts.kycWhitelist;        
    return new this.web3.eth.Contract(Whitelist.abi, contractAddress);
  }

  async validateOnWhitelist(from) {
    const whitelist = this.getWhitelistContract();
    const result = await whitelist.methods.isWhitelisted(from).call({from});
    if (result) {
      console.log(`Address ${from} is on whitelist. Staking.`);
    } else {
      console.error(`Address ${from} is not on whitelist.`);
      throw 'Your address needs to be white listed before you can stake.';
    }
  }

  async release() {
    const stakes = this.getContract(Stakes);
    const from = getDefaultAddress(this.web3);
    const gas = getDefaultGas();
    await stakes.methods.releaseStake().send({from, gas});
  }

  async show() {    
    const stakes = this.getContract(Stakes);
    const from = getDefaultAddress(this.web3);
    console.log(from);    
    const result = await stakes.methods.getStake(from).call();
    console.log(`Stake for ${from} is ${result}.`);
  }

  description() {
    return '[deposit/release/show] [amount]    - manages stake';
  }
}
