/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BN from 'bn.js';
import TaskBase from './base/task_base';
import {ATLAS, HERMES, APOLLO, ROLE_CODES, ATLAS1_STAKE, ATLAS2_STAKE, ATLAS3_STAKE, APOLLO_DEPOSIT} from '../consts';

export default class OnboardingTask extends TaskBase {
  constructor(web3, contractManager) {
    super();
    this.web3 = web3;
    this.contractManager = contractManager;
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
    }
  }

  printUsage() {
    const {fromWei} = this.web3.utils;
    console.log('\nUsage: yarn task onboard [role] [amount] [url]');
    console.log('Available roles are:');
    console.log(`${ATLAS} - ATLAS  (stakes: ${fromWei(ATLAS1_STAKE)}, ${fromWei(ATLAS2_STAKE)}, ${fromWei(ATLAS3_STAKE)} AMB; url: required)`);
    console.log(`${HERMES} - HERMES (no stakes; url required)`);
    console.log(`${APOLLO} - APOLLO (stakes: ${fromWei(APOLLO_DEPOSIT)} AMB; no url)`);
  }

  async onboardAtlas([amount, url]) {
    if (!url) {
      console.error(`Invalid parameters for Atlas onboarding`);
      this.printUsage();
      return;
    }
    await this.validateOnWhitelist('ATLAS');
    const value = this.web3.utils.toWei(new BN(amount));
    const {rolesWrapper} = this.contractManager;
    await rolesWrapper.onboardAsAtlas(url, value);
  }

  async onboardHermes([url]) {
    if (!url) {
      console.error(`Invalid parameters for Atlas onboarding`);
      this.printUsage();
      return;
    }
    await this.validateOnWhitelist('HERMES');
    const {rolesWrapper} = this.contractManager;
    await rolesWrapper.onboardAsHermes(url);
  }

  async onboardApollo([value]) {
    if (!value) {
      console.error(`Invalid parameters for Atlas onboarding`);
      this.printUsage();
      return;
    }
    await this.validateOnWhitelist('APOLLO');
    const {rolesWrapper} = this.contractManager;
    await rolesWrapper.onboardAsApollo(value);
  }

  async validateOnWhitelist(role) {
    const address = this.contractManager.defaultAddress();
    const {kycWhitelistWrapper} = this.contractManager;
    const result = await kycWhitelistWrapper.hasRoleAssigned(address, ROLE_CODES[role]);
    if (result) {
      console.log(`Address ${address} is on whitelist as ${role}. Onboarding.`);
    } else {
      console.error(`Address ${address} is not on whitelist or does not have ${role} role assigned.`);
      throw 'Your address needs to be white listed before you can stake.';
    }
  }

  description() {
    return '[amount] [url]    - manages stake';
  }
}
