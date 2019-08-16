/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


import contractJsons from '../contract_jsons';
import {loadContract} from '../utils/web3_tools';
import GenesisContractWrapper from './genesis_contract_wrapper';
import {ZERO_ADDRESS} from '../constants';


export default class HeadWrapper extends GenesisContractWrapper {
  constructor(headContractAddress, web3, defaultAddress) {
    super(headContractAddress, contractJsons.head, web3, defaultAddress);
    this.clearContractAddressCache();

    this.availableCatalogueContracts = [
      'kycWhitelist',
      'roles',
      'fees',
      'time',
      'challenges',
      'payouts',
      'shelteringTransfers',
      'sheltering',
      'uploads',
      'config',
      'validatorProxy'
    ];

    this.availableStorageCatalogueContracts = [
      'apolloDepositStore',
      'atlasStakeStore',
      'bundleStore',
      'challengesStore',
      'kycWhitelistStore',
      'payoutsStore',
      'rolesStore',
      'shelteringTransfersStore',
      'challengesEventEmitter',
      'transfersEventEmitter',
      'rewardsEventEmitter',
      'rolesEventEmitter'
    ];
  }

  async contractAddressByName(contractName) {
    if (this.availableCatalogueContracts.includes(contractName)) {
      const catalogue = await this.catalogue();
      if (this.isNotInContractAddressCache(contractName)) {
        this.updateContractAddressCache(contractName, await catalogue.methods[`${contractName}()`]().call());
      }
    } else if (this.availableStorageCatalogueContracts.includes(contractName)) {
      const storageCatalogue = await this.storageCatalogue();
      if (this.isNotInContractAddressCache(contractName)) {
        this.updateContractAddressCache(contractName, await storageCatalogue.methods[`${contractName}()`]().call());
      }
    } else {
      throw new Error('Requested contract does not exist');
    }
    return this.cachedAddresses[`${contractName}`];
  }

  async setContext(address) {
    await this.contract.methods.setContext(address).send({
      from: this.defaultAddress
    });
  }

  async context() {
    const contextAddress = await this.contract
      .methods
      .context()
      .call();
    if (contextAddress === ZERO_ADDRESS) {
      throw 'Context address is not set in the head contract';
    }
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

  async storageCatalogue() {
    const context = await this.context();
    if (this.isNotInContractAddressCache('storageCatalogue')) {
      this.updateContractAddressCache('storageCatalogue', await context
        .methods
        .storageCatalogue()
        .call());
    }
    return loadContract(this.web3, contractJsons.storageCatalogue.abi, this.cachedAddresses.storageCatalogue);
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

  async contractsVersion() {
    return (await this.context()).methods.versionTag().call();
  }
}
