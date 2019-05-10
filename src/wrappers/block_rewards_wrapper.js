/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import contractJsons from '../contract_jsons';
import GenesisContractWrapper from './genesis_contract_wrapper';

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
}
