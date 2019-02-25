/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import {ATLAS, HERMES, APOLLO} from '../constants';

export default class OnboardingTask extends TaskBase {
  constructor(web3, nodeAddress, onboardActions) {
    super();
    this.web3 = web3;
    this.onboardActions = onboardActions;
    this.nodeAddress = nodeAddress;
  }

  async execute([role, ...options]) {
    switch (role) {
      case 'ATLAS':
        await this.onboardAtlas(options);
        break;
      case 'HERMES':
        await this.onboardHermes(options);
        break;
      case 'APOLLO':
        await this.onboardApollo(options);
        break;
      default:
        console.error(`Unknown role: ${role}`);
        this.printUsage();
        process.exit(1);
    }
  }

  printUsage() {
    console.log('\nUsage: yarn task onboard [role] [amount] [url]');
    console.log('Available roles are:');
    console.log(`${ATLAS} - ATLAS  (stakes: required in AMB, url: required)`);
    console.log(`${HERMES} - HERMES (no stakes; url required)`);
    console.log(`${APOLLO} - APOLLO (stakes: required in AMB; no url)`);
  }

  async onboardAtlas([stakeAmountInEth, url]) {
    if (!url || !stakeAmountInEth) {
      console.error(`Invalid parameters for Atlas onboarding`);
      this.printUsage();
      process.exit(1);
      return;
    }
    const stakeAmount = this.web3.utils.toWei(stakeAmountInEth, 'ether');
    await this.onboardActions.onboardAsAtlas(this.nodeAddress, stakeAmount, url);
  }

  async onboardHermes([url]) {
    if (!url) {
      console.error(`Invalid parameters for Hermes onboarding`);
      this.printUsage();
      process.exit(1);
      return;
    }
    await this.onboardActions.onboardAsHermes(this.nodeAddress, url);
  }

  async onboardApollo([depositAmountInEth]) {
    if (!depositAmountInEth) {
      console.error(`Invalid parameters for Apollo onboarding`);
      this.printUsage();
      process.exit(1);
      return;
    }
    const depositAmount = this.web3.utils.toWei(depositAmountInEth, 'ether');
    await this.onboardActions.onboardAsApollo(this.nodeAddress, depositAmount);
  }

  help() {
    return {
      options: '[amount] [url]',
      description: 'manages stake'
    };
  }
}
