/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {MIN_BLOCK_TIME} from '../constants';
import ManagedContractWrapper from './managed_contract_wrapper';

export default class ChallengesWrapper extends ManagedContractWrapper {
  get getContractName() {
    return 'challenges';
  }

  async earliestMeaningfulBlock(challengeDuration) {
    return Math.max(0, await this.web3.eth.getBlockNumber() - Math.ceil(challengeDuration / MIN_BLOCK_TIME));
  }

  async challenges(fromBlock, toBlock) {
    const contract = await this.contract();
    return contract.getPastEvents('ChallengeCreated', {fromBlock, toBlock});
  }

  async resolvedChallenges(fromBlock, toBlock) {
    const contract = await this.contract();
    return contract.getPastEvents('ChallengeResolved', {fromBlock, toBlock});
  }

  async timedOutChallenges(fromBlock, toBlock) {
    const contract = await this.contract();
    return contract.getPastEvents('ChallengeTimeout', {fromBlock, toBlock});
  }

  async resolve(challengeId) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.resolve(challengeId));
  }

  async start(sheltererId, bundleId, fee) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.start(sheltererId, bundleId), {value: fee});
  }

  async markAsExpired(challengeId) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.markAsExpired(challengeId));
  }

  async challengeIsTimedOut(challengeId) {
    const contract = await this.contract();
    return contract.methods.challengeIsTimedOut(challengeId).call();
  }

  async canResolve(challengeId) {
    const contract = await this.contract();
    return contract.methods.canResolve(this.defaultAddress, challengeId).call();
  }

  async getChallengeId(sheltererId, bundleId) {
    const contract = await this.contract();
    return contract.methods.getChallengeId(sheltererId, bundleId).call();
  }

  async isInProgress(challengeId) {
    const contract = await this.contract();
    return contract.methods.challengeIsInProgress(challengeId).call();
  }
}
