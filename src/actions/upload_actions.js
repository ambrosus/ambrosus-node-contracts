/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class UploadActions {
  constructor(uploadsWrapper, feesWrapper, shelteringWrapper, blockchainStateWrapper) {
    this.uploadsWrapper = uploadsWrapper;
    this.feesWrapper = feesWrapper;
    this.shelteringWrapper = shelteringWrapper;
    this.blockchainStateWrapper = blockchainStateWrapper;
  }

  async uploadBundle(bundleId, storagePeriods) {
    const {uploadsWrapper: uploads, feesWrapper: fees} = this;
    const value = await fees.feeForUpload(storagePeriods);
    const {blockNumber, transactionHash} = await uploads.registerBundle(bundleId, value, storagePeriods);
    const timestamp = await this.blockchainStateWrapper.getBlockTimestamp(blockNumber);
    return {blockNumber, transactionHash, timestamp};
  }

  async getBundleUploadData(bundleId) {
    const uploadBlock = await this.shelteringWrapper.getBundleUploadBlockNumber(bundleId);
    if (!uploadBlock) {
      return null;
    }
    const timestamp = await this.blockchainStateWrapper.getBlockTimestamp(uploadBlock);
    const {transactionHash} = await this.uploadsWrapper.getUploadData(bundleId, uploadBlock);
    return {blockNumber: uploadBlock, transactionHash, timestamp};
  }
}
