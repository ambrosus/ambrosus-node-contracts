/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


import {loadContract} from '../utils/web3_tools';
import contractJsons from '../contract_jsons';

export default class HeadWrapper {
  constructor(headContractAddress, web3, defaultAddress) {
    if (headContractAddress === undefined) {
      throw new Error('Head contract address is not configured');
    }

    this.web3 = web3;
    this.defaultAddress = defaultAddress;
    this.head = loadContract(this.web3, contractJsons.head.abi, headContractAddress);
    this.clearContractAddressCache();
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
      'config',
      'time'
    ];

    if (!availableContracts.includes(contractName)) {
      throw new Error('Requested contract does not exist');
    }
    const catalogue = await this.catalogue();
    if (this.isNotInContractAddressCache(contractName)) {
      this.updateContractAddressCache(contractName, await catalogue.methods[`${contractName}()`]().call());
    }
    return this.cachedAddresses[`${contractName}`];
  }

  async setContext(address) {
    await this.head.methods.setContext(address).send({
      from: this.defaultAddress
    });
  }

  async context() {
    const contextAddress = await this.head
      .methods
      .context()
      .call();
    if (this.cachedContractAddressHasChanged(contextAddress, 'context')) {
      this.clearContractAddressCache();
      this.updateContractAddressCache('context', contextAddress);
    }
    return loadContract(this.web3, contractJsons.context.abi, contextAddress);
  }

  async catalogue() {
    const context = await this.context();
    if (this.isNotInContractAddressCache('catalogue')) {
      this.updateContractAddressCache('catalogue', await context
        .methods
        .catalogue()
        .call());
    }
    return loadContract(this.web3, contractJsons.catalogue.abi, this.cachedAddresses.catalogue);
  }

  async getOwner() {
    return this.head.methods.owner().call();
  }

  clearContractAddressCache() {
    this.cachedAddresses = {};
  }

  isNotInContractAddressCache(contractName) {
    return !(`${contractName}` in this.cachedAddresses);
  }

  cachedContractAddressHasChanged(contractAddress, contractName) {
    return contractAddress !== this.cachedAddresses[`${contractName}`];
  }

  updateContractAddressCache(contractName, contractAddress) {
    this.cachedAddresses[`${contractName}`] = contractAddress;
  }
}
