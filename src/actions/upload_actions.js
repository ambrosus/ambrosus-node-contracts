/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BN from 'bn.js';
import {utils} from 'web3';

export default class UploadActions {
  constructor(uploadsWrapper, feesWrapper, shelteringWrapper, blockchainStateWrapper, lowFundsWarningAmount = 0) {
    this.uploadsWrapper = uploadsWrapper;
    this.feesWrapper = feesWrapper;
    this.shelteringWrapper = shelteringWrapper;
    this.blockchainStateWrapper = blockchainStateWrapper;
    this.lowFundsWarningAmount = new BN(lowFundsWarningAmount);
  }

  async uploadBundle(bundleId, storagePeriods) {
    const fee = await this.getFee(storagePeriods);
    const balance = await this.getBalance();
    if (balance.lte(new BN(fee))) {
      return {error: `Insufficient funds: need at least ${utils.fromWei(fee, 'ether')} to upload the bundle. Balance: ${utils.fromWei(balance, 'ether')}`};
    }
    const {blockNumber, transactionHash} = await this.uploadsWrapper.registerBundle(bundleId, fee, storagePeriods);
    const timestamp = await this.blockchainStateWrapper.getBlockTimestamp(blockNumber);
    const uploadResult = {blockNumber, transactionHash, timestamp};
    if (balance.lte(this.lowFundsWarningAmount)) {
      return {...uploadResult, warning: `Hermes low balance warning triggered. Balance: ${utils.fromWei(balance, 'ether')}`};
    }
    return uploadResult;
  }

  async getBalance() {
    return new BN(await this.blockchainStateWrapper.getBalance(this.uploadsWrapper.defaultAddress));
  }

  async getFee(storagePeriods) {
    return await this.feesWrapper.feeForUpload(storagePeriods);
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
