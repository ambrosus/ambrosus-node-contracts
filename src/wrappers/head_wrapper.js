/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


import {loadContract} from '../utils/web3_tools';
import {serviceContractsJsons} from './contracts_consts';

export default class HeadWrapper {
  constructor(headContractAddress, web3, defaultAddress) {
    if (headContractAddress === undefined) {
      throw new Error('Head contract address is not configured');
    }

    this.web3 = web3;
    this.defaultAddress = defaultAddress;
    this.head = loadContract(this.web3, serviceContractsJsons.head.abi, headContractAddress);
  }

  setDefaultAddress(defaultAddress) {
    this.defaultAddress = defaultAddress;
  }

  async contractAddressByName(contractName) {
    const availableContracts = [
      'kycWhitelist',
      'roles',
      'fees',
      'challenges',
      'payouts',
      'shelteringTransfers',
      'sheltering',
      'uploads',
      'config'
    ];

    if (!availableContracts.includes(contractName)) {
      throw new Error('Requested contract does not exist');
    }

    const context = await this.context();
    return context.methods[`${contractName}()`]().call({from: this.defaultAddress});
  }

  async context() {
    const contextAddress = await this.head
      .methods
      .context()
      .call({from: this.defaultAddress});
    return loadContract(this.web3, serviceContractsJsons.context.abi, contextAddress);
  }
}
