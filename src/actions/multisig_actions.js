/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class MultisigActions {
  constructor(multisigWrapper, multiplexerWrapper, multisigFunctions) {
    this.multisigWrapper = multisigWrapper;
    this.multiplexerWrapper = multiplexerWrapper;
    this.multisigFunctions = multisigFunctions;
  }

  async getTransactionCallFromData(transactionId) {
    const {data} = await this.multisigWrapper.getTransaction(transactionId);
    const name = this.multisigFunctions.getFunctionName(data);
    const args = this.multisigFunctions.getFunctionArguments(data);
    return {name, args, transactionId};
  }

  async allPendingTransactions() {
    const requiredConfirmations = await this.confirmationsRequired();
    const allPendingTransactionIds = await this.multisigWrapper.getPendingTransaction();
    const allPendingTransactions = [];
    for (const txId of allPendingTransactionIds) {
      const confirmationCount = parseInt(await this.multisigWrapper.getConfirmationCount(txId), 10);
      if (confirmationCount < requiredConfirmations) {
        allPendingTransactions.push({
          ...await this.getTransactionCallFromData(txId),
          confirmations: {
            required: requiredConfirmations,
            confirmed: confirmationCount
          }
        });
      }
    }
    return allPendingTransactions;
  }

  async confirmationsRequired() {
    return parseInt(await this.multisigWrapper.confirmationsRequired(), 10);
  }

  async approvableTransactions() {
    const allPendingTransactions = await this.allPendingTransactions();
    const approvableTransactions = [];
    for (const transaction of allPendingTransactions) {
      const confirmations = await this.multisigWrapper.getConfirmations(transaction.transactionId);
      if (!confirmations.includes(this.multisigWrapper.defaultAddress)) {
        approvableTransactions.push(transaction);
      }
    }
    return approvableTransactions;
  }

  checkIfTransactionDitNotFail(transactionData) {
    if (transactionData.events.ExecutionFailure) {
      throw new Error(
        `Transaction #${transactionData.events.ExecutionFailure.returnValues.transactionId} has been rejected`);
    }
    return transactionData;
  }

  async submitTransaction(data, senderAddress = this.multiplexerWrapper.address()) {
    return this.checkIfTransactionDitNotFail(
      await this.multisigWrapper.submitTransaction(senderAddress, '0', data));
  }

  async transferMultiplexerOwnership(address) {
    return this.submitTransaction(await this.multiplexerWrapper.transferOwnership(address));
  }

  async transferContractsOwnership(address) {
    return this.submitTransaction(await this.multiplexerWrapper.transferContractsOwnership(address));
  }

  async changeContext(contextAddress) {
    return this.submitTransaction(await this.multiplexerWrapper.changeContext(contextAddress));
  }

  async addToWhitelist(candidateAddress, role, deposit) {
    return this.submitTransaction(await this.multiplexerWrapper.addToWhitelist(candidateAddress, role, deposit));
  }

  async removeFromWhitelist(candidateAddress) {
    return this.submitTransaction(await this.multiplexerWrapper.removeFromWhitelist(candidateAddress));
  }

  async setBaseUploadFee(fee) {
    return this.submitTransaction(await this.multiplexerWrapper.setBaseUploadFee(fee));
  }

  async setBaseReward(newBaseReward) {
    return this.submitTransaction(await this.multiplexerWrapper.setBaseReward(newBaseReward));
  }

  async transferOwnershipForValidatorSet(address) {
    return this.submitTransaction(await this.multiplexerWrapper.transferOwnershipForValidatorSet(address));
  }

  async transferOwnershipForBlockRewards(address) {
    return this.submitTransaction(await this.multiplexerWrapper.transferOwnershipForBlockRewards(address));
  }

  async confirmTransaction(transactionId) {
    return this.checkIfTransactionDitNotFail(await this.multisigWrapper.confirmTransaction(transactionId));
  }

  async revokeConfirmation(transactionId) {
    return this.multisigWrapper.revokeConfirmation(transactionId);
  }

  async addOwner(newOwnerAddress) {
    return this.submitTransaction(await this.multisigWrapper.addOwner(newOwnerAddress), this.multisigWrapper.address);
  }

  async removeOwner(ownerAddress) {
    return this.submitTransaction(await this.multisigWrapper.removeOwner(ownerAddress), this.multisigWrapper.address);
  }

  async changeRequirement(newRequiredConfirmationsCount) {
    return this.submitTransaction(await this.multisigWrapper.changeRequirement(newRequiredConfirmationsCount), this.multisigWrapper.address);
  }

  async getOwners() {
    return this.multisigWrapper.getOwners();
  }
}
