/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BN from 'bn.js';

const FIRST_MEANINGFUL_PERIOD = 630; // May 2018

export default class PayoutsActions {
  constructor(timeWrapper, payoutsWrapper) {
    this.timeWrapper = timeWrapper;
    this.payoutsWrapper = payoutsWrapper;
  }

  async currentPayoutPeriod() {
    return this.timeWrapper.currentPayoutPeriod();
  }

  async nextPayoutPeriodStart() {
    const nextPayoutPeriod = parseInt(await this.currentPayoutPeriod(), 10) + 1;
    return this.timeWrapper.payoutPeriodStart(nextPayoutPeriod);
  }

  async getTotalAvailablePayout() {
    const currentPayout = parseInt(await this.currentPayoutPeriod(), 10);
    let availablePayout = new BN('0');
    for (let ind = FIRST_MEANINGFUL_PERIOD; ind < currentPayout; ind++) {
      availablePayout = availablePayout.add(new BN(await this.payoutsWrapper.availablePayoutAmountInPeriod(ind)));
    }
    return availablePayout.toString();
  }

  async withdraw() {
    await this.payoutsWrapper.withdraw();
  }
}
