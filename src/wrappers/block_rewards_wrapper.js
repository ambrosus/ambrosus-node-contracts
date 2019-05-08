/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BN from 'bn.js';

import contractJsons from '../contract_jsons';
import GenesisContractWrapper from './genesis_contract_wrapper';
import {TOTAL_AMB_SUPPLY, BLOCKS_PER_YEAR} from '../constants';

export default class BlockRewardsWrapper extends GenesisContractWrapper {
  constructor(blockRewardsContractAddress, web3, defaultAddress) {
    super(blockRewardsContractAddress, contractJsons.blockRewards, web3, defaultAddress);
  }

  async baseRewardChanges(fromBlock, toBlock) {
    return this.contract.getPastEvents('BaseRewardChanged', {fromBlock, toBlock});
  }

  async getBaseReward() {
    return this.contract.methods.baseReward().call();
  }

  convertRateToBaseReward(rate) {
    if (rate < 0 || rate > 100) {
      return -1;
    }

    const totalSupply = new BN(TOTAL_AMB_SUPPLY);
    const numberOfBlocksInYear = new BN(BLOCKS_PER_YEAR);
    const rewardPercent = totalSupply.div(numberOfBlocksInYear).divn(100);
    const percentageRate = rate * 100;

    return rewardPercent.muln(percentageRate).divn(100);
  }

  convertBaseRewardToRate(baseReward) {
    const totalSupply = new BN(TOTAL_AMB_SUPPLY);
    const numberOfBlocksInYear = new BN(BLOCKS_PER_YEAR);
    const percentageRate = baseReward.mul(numberOfBlocksInYear).muln(100)
      .muln(100)
      .divRound(totalSupply);

    const rate = percentageRate.toNumber() / 100;

    return rate;
  }

  async getBaseRewardRate() {
    const currentBaseReward = new BN(await this.getBaseReward());

    return this.convertBaseRewardToRate(currentBaseReward);
  }
}
