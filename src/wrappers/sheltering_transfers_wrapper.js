/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {MIN_BLOCK_TIME} from '../constants';
import ManagedContractWrapper from './managed_contract_wrapper';

export default class ShelteringTransfersWrapper extends ManagedContractWrapper {
  get getContractName() {
    return 'shelteringTransfers';
  }

  async earliestMeaningfulBlock(transferDuration) {
    return Math.max(0, await this.web3.eth.getBlockNumber() - Math.ceil(transferDuration / MIN_BLOCK_TIME));
  }

  async resolve(transferId) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.resolve(transferId));
  }

  async start(bundleId) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.start(bundleId));
  }

  async cancel(transferId) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.cancel(transferId));
  }

  async getTransferId(sheltererId, bundleId) {
    const contract = await this.contract();
    return contract.methods.getTransferId(sheltererId, bundleId).call();
  }

  async getDonor(transferId) {
    const contract = await this.contract();
    return contract.methods.getDonor(transferId).call();
  }

  async getTransferredBundle(transferId) {
    const contract = await this.contract();
    return contract.methods.getTransferredBundle(transferId).call();
  }

  async isInProgress(transferId) {
    const contract = await this.contract();
    return contract.methods.transferIsInProgress(transferId).call();
  }

  async canResolve(transferId) {
    const contract = await this.contract();
    return contract.methods.canResolve(this.defaultAddress, transferId).call();
  }

  async getTransferCreationTime(transferId) {
    const contract = await this.contract();
    return contract.methods.getTransferCreationTime(transferId).call();
  }

  async getTransferDesignatedShelterer(transferId) {
    const contract = await this.contract();
    return contract.methods.getTransferDesignatedShelterer(transferId).call();
  }
}
