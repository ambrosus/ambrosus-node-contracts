/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ManagedContractWrapper from './managed_contract_wrapper';

export default class ShelteringWrapper extends ManagedContractWrapper {
  get getContractName() {
    return 'sheltering';
  }

  async isSheltering(bundleId, shelterer = this.defaultAddress) {
    const contract = await this.contract();
    return contract.methods.isSheltering(bundleId, shelterer).call();
  }

  async addSheltererReward(sheltererId, bundleId, reward) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.addSheltererReward(sheltererId, bundleId), {value: reward});
  }

  async shelteringExpirationDate(bundleId) {
    const contract = await this.contract();
    return contract.methods.getShelteringExpirationDate(bundleId, this.defaultAddress).call();
  }

  async bundleStoragePeriods(bundleId) {
    const contract = await this.contract();
    return contract.methods.getBundleStoragePeriodsCount(bundleId).call();
  }

  async getBundleUploadBlockNumber(bundleId) {
    const contract = await this.contract();
    const uploadBlockNumber = await contract.methods.getBundleUploadBlockNumber(bundleId).call();
    return uploadBlockNumber === '0' ? null : parseInt(uploadBlockNumber, 10);
  }

  async getBundleUploader(bundleId) {
    const contract = await this.contract();
    return contract.methods.getBundleUploader(bundleId).call();
  }
}
