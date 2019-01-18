/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BN from 'bn.js';
import {InsufficientFundsToStartChallengeError} from '../errors/errors';

export default class ChallengesActions {
  constructor(challengesWrapper, feeWrapper, shelteringWrapper, blockchainStateWrapper) {
    this.challengesWrapper = challengesWrapper;
    this.feeWrapper = feeWrapper;
    this.shelteringWrapper = shelteringWrapper;
    this.blockchainStateWrapper = blockchainStateWrapper;
  }

  async startChallenge(sheltererId, bundleId) {
    if (!await this.shelteringWrapper.isSheltering(bundleId, sheltererId)) {
      throw new Error(`${sheltererId} is not holding ${bundleId}`);
    }
    const challengeId = await this.challengesWrapper.getChallengeId(sheltererId, bundleId);
    if (await this.challengesWrapper.isInProgress(challengeId)) {
      throw new Error('Could not start a challenge: same challenge is in progress');
    }
    const storagePeriods = await this.shelteringWrapper.bundleStoragePeriods(bundleId);
    const fee = await this.feeWrapper.feeForChallenge(storagePeriods);
    const balance = await this.getBalance();
    if (new BN(balance).lte(new BN(fee))) {
      throw new InsufficientFundsToStartChallengeError(fee, balance);
    }
    const {blockNumber, transactionHash} = await this.challengesWrapper.start(sheltererId, bundleId, fee);
    return {
      blockNumber,
      transactionHash,
      challengeId
    };
  }

  async markAsExpired(challengeId) {
    if (!await this.challengesWrapper.isInProgress(challengeId)) {
      throw new Error(`Challenge ${challengeId} not found`);
    }
    if (!await this.challengesWrapper.challengeIsTimedOut(challengeId)) {
      throw new Error(`Challenge ${challengeId} cannot be marked as expired yet`);
    }
    return this.challengesWrapper.markAsExpired(challengeId);
  }

  async challengeStatus(challengeId) {
    if (!await this.challengesWrapper.isInProgress(challengeId)) {
      return {isInProgress: false};
    }
    return {
      isInProgress: true,
      canResolve: await this.challengesWrapper.canResolve(challengeId),
      isTimedOut: await this.challengesWrapper.challengeIsTimedOut(challengeId)
    };
  }

  /** @private */
  async getBalance() {
    return await this.blockchainStateWrapper.getBalance(this.challengesWrapper.defaultAddress);
  }
}
