/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {MIN_BLOCK_TIME} from '../constants';
import ManagedContractWrapper from './managed_contract_wrapper';

export default class ChallengeWrapper extends ManagedContractWrapper {
  get getContractName() {
    return 'challenges';
  }

  async earliestMeaningfulBlock(challengeDuration) {
    return Math.max(0, await this.web3.eth.getBlockNumber() - Math.ceil(challengeDuration / MIN_BLOCK_TIME));
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

  async getChallengeCreationTime(challengeId) {
    const contract = await this.contract();
    return contract.methods.getCreationTime(challengeId).call();
  }

  async isInProgress(challengeId) {
    const contract = await this.contract();
    return contract.methods.isInProgress(challengeId).call();
  }

  async getChallengeDesignatedShelterer(challengeId) {
    const contract = await this.contract();
    return contract.methods.getDesignatedShelterer(challengeId).call();
  }
}
