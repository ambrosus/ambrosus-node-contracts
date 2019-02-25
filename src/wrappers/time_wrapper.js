/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ManagedContractWrapper from './managed_contract_wrapper';

export default class TimeWrapper extends ManagedContractWrapper {
  get getContractName() {
    return 'time';
  }

  async currentPayoutPeriod() {
    const contract = await this.contract();
    return contract.methods.currentPayoutPeriod().call();
  }

  async payoutPeriodStart(payoutPeriod) {
    const contract = await this.contract();
    return contract.methods.payoutPeriodStart(payoutPeriod).call();
  }
}
