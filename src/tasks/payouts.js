/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';

export default class PayoutsTask extends TaskBase {
  constructor(web3, sender, payoutsActions) {
    super();
    this.web3 = web3;
    this.sender = sender;
    this.payoutsActions = payoutsActions;
  }

  async execute(args) {
    const [command] = args;
    if (command === 'total') {
      await this.totalAmount();
    } else if (command === 'withdraw') {
      await this.withdraw();
    } else if (command === 'period') {
      await this.currentPeriod();
    } else {
      console.error('Unknown sub-command, use: yarn task payout [total/withdraw/period]');
      process.exit(1);
    }
  }

  async totalAmount() {
    try {
      const amount = await this.payoutsActions.getTotalAvailablePayout();
      console.log(`You can withdraw ${this.web3.utils.fromWei(amount, 'ether')} AMB now!`);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }

  async withdraw() {
    try {
      const totalAvailablePayout = await this.payoutsActions.getTotalAvailablePayout();
      if (totalAvailablePayout === '0') {
        console.log('Nothing to withdraw :(');
        return;
      }
      await this.payoutsActions.withdraw();
      const payoutInAMB = this.web3.utils.fromWei(totalAvailablePayout, 'ether');
      console.log(`${payoutInAMB} AMB have been sent to your account`);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }

  async currentPeriod() {
    try {
      const period = await this.payoutsActions.currentPayoutPeriod();
      console.log(`Current payout period: ${period}`);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }

  help() {
    return {
      options: '[total/withdraw/period]',
      description: 'operations with payouts'
    };
  }
}
