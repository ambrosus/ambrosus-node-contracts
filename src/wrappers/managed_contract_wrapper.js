/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {loadContract} from '../utils/web3_tools';
import contractJsons from '../contract_jsons';
import ContractWrapper from './contract_wrapper';

/** @abstract */
export default class ManagedContractWrapper extends ContractWrapper {
  constructor(headWrapper, web3, defaultAddress) {
    super(web3, defaultAddress);
    this.headWrapper = headWrapper;
  }

  async address() {
    return this.headWrapper.contractAddressByName(this.getContractName);
  }

  async contract() {
    const contractAddress = await this.headWrapper.contractAddressByName(this.getContractName);
    return loadContract(this.web3, contractJsons[this.getContractName].abi, contractAddress);
  }

  get getContractName() {
    throw new Error('Abstract method getContractName needs to be overridden');
  }
}
