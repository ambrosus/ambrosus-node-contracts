/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import GenesisContractWrapper from './genesis_contract_wrapper';
import contractJsons from '../contract_jsons';

export default class ValidatorSetWrapper extends GenesisContractWrapper {
  constructor(validatorSetContractAddress, web3, defaultAddress) {
    super(validatorSetContractAddress, contractJsons.validatorSet, web3, defaultAddress);
  }

  async getValidators() {
    return this.contract.methods.getValidators().call();
  }
}
