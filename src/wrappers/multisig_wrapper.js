/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ContractWrapper from './contract_wrapper';
import {loadContract} from '../utils/web3_tools';
import {multisig} from '../contract_jsons';

export default class MultisigWrapper extends ContractWrapper {
  constructor(contractAddress, web3, defaultAddress) {
    super(web3, defaultAddress);
    this.address = contractAddress;
    this.contract = loadContract(web3, multisig.abi, contractAddress);
  }

  async getPendingTransaction() {
    const count = await this.contract.methods.getTransactionCount(true, false).call();
    return this.contract.methods.getTransactionIds(0, count, true, false).call();
  }

  async getConfirmations(transactionId) {
    return this.contract.methods.getConfirmations(transactionId).call();
  }

  async getConfirmationCount(transactionId) {
    return this.contract.methods.getConfirmationCount(transactionId).call();
  }

  async confirmationsRequired() {
    return this.contract.methods.required().call();
  }

  async submitTransaction(destination, value, data) {
    return this.processTransaction(this.contract.methods.submitTransaction(destination, value, data));
  }

  async confirmTransaction(transactionId) {
    return this.processTransaction(this.contract.methods.confirmTransaction(transactionId));
  }

  async revokeConfirmation(transactionId) {
    return this.processTransaction(this.contract.methods.revokeConfirmation(transactionId));
  }

  async getTransaction(transactionId) {
    return this.contract.methods.transactions(transactionId).call();
  }

  addOwner(ownerAddress) {
    return this.contract.methods.addOwner(ownerAddress).encodeABI();
  }

  removeOwner(ownerAddress) {
    return this.contract.methods.removeOwner(ownerAddress).encodeABI();
  }

  changeRequirement(newRequiredConfirmationsCount) {
    return this.contract.methods.changeRequirement(newRequiredConfirmationsCount).encodeABI();
  }

  async getOwners() {
    return this.contract.methods.getOwners().call();
  }
}
