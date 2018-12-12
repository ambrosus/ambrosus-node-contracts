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
    const {blockNumber, transactionHash} = await contract.methods.registerBundle(bundleId, storagePeriods).send({from: this.defaultAddress, value: fee});
    return {blockNumber, transactionHash};
  }

  /**
   * @returns {Object} bundle blockchain data
   * @property {number} blockNumber block number when the bundle was uploaded
   * @property {string} transactionHash bundle upload transaction hash
   */
  async getUploadData(bundleId, blockNumber) {
    const contract = await this.contract();
    const bundleUploadEvents = (await contract.getPastEvents('BundleUploaded', {fromBlock: blockNumber, toBlock: blockNumber})).filter(({returnValues}) => returnValues.bundleId === bundleId);
    if (bundleUploadEvents.length === 0) {
      return null;
    }
    const [{transactionHash}] = bundleUploadEvents;
    return {
      transactionHash,
      blockNumber
    };
  }
}
