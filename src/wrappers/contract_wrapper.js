/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/** @abstract */
export default class ContractWrapper {
  constructor(web3, defaultAddress) {
    this.web3 = web3;
    this.defaultAddress = defaultAddress;
  }

  async processTransaction(transactionObject, sendParams = {}) {
    return transactionObject.send({from: this.defaultAddress, ...sendParams});
  }

  setDefaultAddress(defaultAddress) {
    this.defaultAddress = defaultAddress;
  }
}
