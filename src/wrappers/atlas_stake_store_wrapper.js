/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ManagedContractWrapper from './managed_contract_wrapper';

export default class AtlasStakeStoreWrapper extends ManagedContractWrapper {
  get getContractName() {
    return 'atlasStakeStore';
  }

  async isShelteringAny(nodeAddress) {
    const contract = await this.contract();
    return contract.methods.isShelteringAny(nodeAddress).call();
  }

  async getPenaltiesHistory(nodeAddress) {
    const contract = await this.contract();
    return contract.methods.getPenaltiesHistory(nodeAddress).call();
  }

  async getStake(nodeAddress) {
    const contract = await this.contract();
    return contract.methods.getStake(nodeAddress).call();
  }

  async getBasicStake(nodeAddress) {
    const contract = await this.contract();
    return contract.methods.getBasicStake(nodeAddress).call();
  }
}
