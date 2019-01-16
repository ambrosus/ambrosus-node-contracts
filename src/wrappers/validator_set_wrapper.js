/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {loadContract} from '../utils/web3_tools';
import contractJsons from '../contract_jsons';

export default class ValidatorSetWrapper {
  constructor(validatorSetContractAddress, web3) {
    if (validatorSetContractAddress === undefined) {
      throw new Error('Validator Set contract address is not configured');
    }

    this.web3 = web3;
    this.contract = loadContract(this.web3, contractJsons.validatorSet.abi, validatorSetContractAddress);
  }

  async getOwner() {
    return this.contract.methods.owner().call();
  }

  address() {
    return this.contract.options.address;
  }
}
