/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ManagedOwnableContractWrapper from './managed_ownable_contract_wrapper';

export default class FeesWrapper extends ManagedOwnableContractWrapper {
  get getContractName() {
    return 'fees';
  }

  async setBaseUploadFee(fee) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.setBaseUploadFee(fee));
  }

  async feeForUpload(storagePeriods) {
    const contract = await this.contract();
    return contract.methods.getFeeForUpload(storagePeriods).call();
  }

  async feeForChallenge(storagePeriods) {
    const contract = await this.contract();
    return contract.methods.getFeeForChallenge(storagePeriods).call();
  }

  async getPenalty(nominalStake, penaltiesCount, lastPenaltyTime) {
    const contract = await this.contract();
    return contract.methods.getPenalty(nominalStake, penaltiesCount, lastPenaltyTime).call();
  }

  async getDeveloper() {
    const contract = await this.contract();
    return contract.methods.developer().call();
  }

  async setDeveloper(developer) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.setDeveloper(developer));
  }

  async getDeveloperFee() {
    const contract = await this.contract();
    return contract.methods.developerFeePPM().call();
  }

  async setDeveloperFee(fee) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.setDeveloperFee(fee));
  }

  async getDeveloperUploadFee() {
    const contract = await this.contract();
    return contract.methods.developerUploadFeePPM().call();
  }

  async setDeveloperUploadFee(fee) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.setDeveloperUploadFee(fee));
  }

  async setSupportFee(support, fee) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.setSupportFee(support, fee));
  }

  async getAdmins() {
    const contract = await this.contract();
    return contract.methods.getAdmins().call();
  }

  async addAdmin(admin) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.addAdmin(admin));
  }

  async removeAdmin(admin) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.removeAdmin(admin));
  }

  async setPaused(paused) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.setPaused(paused));
  }
}
