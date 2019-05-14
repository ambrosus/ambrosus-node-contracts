/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ManagedOwnableContractWrapper from './managed_ownable_contract_wrapper';

export default class ValidatorProxyWrapper extends ManagedOwnableContractWrapper {
  get getContractName() {
    return 'validatorProxy';
  }

  async transferOwnershipForValidatorSet(newOwner) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.transferOwnershipForValidatorSet(newOwner));
  }

  async transferOwnershipForBlockRewards(newOwner) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.transferOwnershipForBlockRewards(newOwner));
  }

  async setBaseReward(newBaseReward) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.setBaseReward(newBaseReward));
  }

  async getBlockRewardsContractAddress() {
    const contract = await this.contract();
    return contract.methods.blockRewards().call();
  }
}
