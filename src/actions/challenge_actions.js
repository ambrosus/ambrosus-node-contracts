/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BN from 'bn.js';
import {InsufficientFundsToStartChallengeError} from '../errors/errors';

export default class ChallengeActions {
  constructor(challengeWrapper, feeWrapper, shelteringWrapper, blockchainStateWrapper, atlasStakeStoreWrapper) {
    this.challengeWrapper = challengeWrapper;
    this.feeWrapper = feeWrapper;
    this.shelteringWrapper = shelteringWrapper;
    this.blockchainStateWrapper = blockchainStateWrapper;
    this.atlasStakeStoreWrapper = atlasStakeStoreWrapper;
  }

  async startChallenge(sheltererId, bundleId) {
    if (!await this.shelteringWrapper.isSheltering(bundleId, sheltererId)) {
      throw new Error(`${sheltererId} is not sherltering ${bundleId}`);
    }
    const challengeId = await this.challengeWrapper.getChallengeId(sheltererId, bundleId);
    if (await this.challengeWrapper.isInProgress(challengeId)) {
      throw new Error('Could not start a challenge: same challenge is currently in progress');
    }
    const storagePeriods = await this.shelteringWrapper.bundleStoragePeriods(bundleId);
    const fee = await this.feeWrapper.feeForChallenge(storagePeriods);
    const balance = await this.getBalance();
    if (new BN(balance).lte(new BN(fee))) {
      throw new InsufficientFundsToStartChallengeError(fee, balance);
    }
    const {blockNumber, transactionHash} = await this.challengeWrapper.start(sheltererId, bundleId, fee);
    return {
      blockNumber,
      transactionHash,
      challengeId
    };
  }

  async markAsExpired(challengeId) {
    if (!await this.challengeWrapper.isInProgress(challengeId)) {
      throw new Error(`Challenge ${challengeId} not found`);
    }
    if (!await this.challengeWrapper.challengeIsTimedOut(challengeId)) {
      throw new Error(`Challenge ${challengeId} cannot be marked as expired`);
    }
    return this.challengeWrapper.markAsExpired(challengeId);
  }

  async challengeStatus(challengeId) {
    if (!await this.challengeWrapper.isInProgress(challengeId)) {
      return {isInProgress: false};
    }
    return {
      isInProgress: true,
      canResolve: await this.challengeWrapper.canResolve(challengeId),
      isTimedOut: await this.challengeWrapper.challengeIsTimedOut(challengeId)
    };
  }

  /** @private */
  async getBalance() {
    return this.blockchainStateWrapper.getBalance(this.challengeWrapper.defaultAddress);
  }

  async nextPenalty(nodeAddress) {
    const basicStake = await this.atlasStakeStoreWrapper.getBasicStake(nodeAddress);
    if (basicStake === '0') {
      throw new Error(`Node ${nodeAddress} is not onboarded as an ATLAS`);
    }
    const {penaltiesCount, lastPenaltyTime} = await this.atlasStakeStoreWrapper.getPenaltiesHistory(nodeAddress);
    return (await this.feeWrapper.getPenalty(basicStake, penaltiesCount, lastPenaltyTime)).penalty;
  }
}
