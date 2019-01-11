/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ContractWrapper from './contract_wrapper';

export default class PayoutWrapper extends ContractWrapper {
  get getContractName() {
    return 'payouts';
  }

  // Resolves in AMB * 10^(-18) units
  async availablePayoutAmountAtPeriod(payoutPeriod) {
    const contract = await this.contract();
    return contract.methods.available(payoutPeriod).call();
  }

  async withdraw() {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.withdraw(this.defaultAddress));
  }
}
