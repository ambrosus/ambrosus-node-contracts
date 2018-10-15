/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ContractWrapper from './contract_wrapper';

export default class UploadsWrapper extends ContractWrapper {
  get getContractName() {
    return 'uploads';
  }

  async registerBundle(bundleId, fee, storagePeriods) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.registerBundle(bundleId, storagePeriods), {from: this.defaultAddress, value: fee});
  }

  /**
   * @returns {Object} bundle blockchain data
   * @property {number} blockNumber block number when the bundle was uploaded
   * @property {string} transactionHash bundle upload transaction hash
   * @property {string} uploader bundle uploader address
   */
  async getUploadData(bundleId) {
    const contract = await this.contract();
    const [{transactionHash, blockNumber}] = await contract.getPastEvents('BundleUploaded', {bundleId});
    const {from: uploader} = await this.web3.eth.getTransaction(transactionHash);
    return {
      transactionHash,
      blockNumber,
      uploader
    };
  }
}
