/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ManagedContractWrapper from './managed_contract_wrapper';

export default class ValidatorProxyWrapper extends ManagedContractWrapper {
  get getContractName() {
    return 'validatorProxy';
  }

  async getOwner() {
    const contract = await this.contract();
    return contract.methods.owner().call();
  }

  async transferOwnershipForValidatorSet(newOwner) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.transferOwnershipForValidatorSet(newOwner));
  }

  async transferOwnershipForBlockRewards(newOwner) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.transferOwnershipForBlockRewards(newOwner));
  }
}
