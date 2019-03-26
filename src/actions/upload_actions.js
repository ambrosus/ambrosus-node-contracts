/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BN from 'bn.js';
import {InsufficientFundsToUploadBundleError} from '../errors/errors';

export default class UploadActions {
  constructor(uploadsWrapper, feesWrapper, shelteringWrapper, blockchainStateWrapper, challengesEventEmitterWrapper, lowFundsWarningAmount = '0') {
    this.uploadsWrapper = uploadsWrapper;
    this.feesWrapper = feesWrapper;
    this.shelteringWrapper = shelteringWrapper;
    this.blockchainStateWrapper = blockchainStateWrapper;
    this.challengesEventEmitterWrapper = challengesEventEmitterWrapper;
    this.lowFundsWarningAmount = new BN(lowFundsWarningAmount);
  }

  async uploadBundle(bundleId, storagePeriods) {
    const fee = await this.feesWrapper.feeForUpload(storagePeriods);
    const balance = await this.getBalance();
    if (new BN(balance).lte(new BN(fee))) {
      throw new InsufficientFundsToUploadBundleError(fee, balance);
    }
    const {blockNumber, transactionHash} = await this.uploadsWrapper.registerBundle(bundleId, fee, storagePeriods);
    const timestamp = await this.blockchainStateWrapper.getBlockTimestamp(blockNumber);
    return {
      blockNumber,
      transactionHash,
      timestamp,
      lowBalanceWarning: new BN(balance).lt(this.lowFundsWarningAmount),
      approximateBalanceAfterUpload: new BN(balance).sub(new BN(fee))
        .toString()
    };
  }

  async getBalance() {
    return this.blockchainStateWrapper.getBalance(this.uploadsWrapper.defaultAddress);
  }

  async getBundleUploadData(bundleId) {
    const uploadBlock = await this.shelteringWrapper.getBundleUploadBlockNumber(bundleId);
    if (!uploadBlock) {
      return null;
    }
    const timestamp = await this.blockchainStateWrapper.getBlockTimestamp(uploadBlock);
    const events = await this.challengesEventEmitterWrapper.challenges(uploadBlock, uploadBlock);
    const {transactionHash} = events.find(({returnValues}) => returnValues.bundleId === bundleId);
    return {blockNumber: uploadBlock, transactionHash, timestamp};
  }
}
