/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ManagedOwnableContractWrapper from './managed_ownable_contract_wrapper';

export default class ApproveCollectorWrapper extends ManagedOwnableContractWrapper {
  get getContractName() {
    return 'kycWhitelist';
  }

  async addTransaction(executor, transaction) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.addTransaction(executor, transaction));
  }

  async approveTransaction(transactionId) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.approveTransaction(transactionId));
  }

  async hasApproved(transactionId) {
    const contract = await this.contract();
    return contract.methods.hasApproved(transactionId).call();
  }

  async getPendingTransactions() {
    const contract = await this.contract();
    return contract.methods.getPendingTransactions().call();
  }

  async getTransactionInfo(transactionId) {
    const contract = await this.contract();
    return contract.methods.getTransactionInfo(transactionId).call();
  }

  async addAdministrator(address) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.addAdministrator(address));
  }

  async deleteAdministrator(address) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.deleteAdministrator(address));
  }

  async getMultiplexor() {
    const contract = await this.contract();
    return contract.methods.getMultiplexor().call();
  }

  async updateMultiplexorContract(address) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.updateMultiplexorContract(address));;
  }
}
