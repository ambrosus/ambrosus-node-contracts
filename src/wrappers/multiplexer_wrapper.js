/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import contractJsons from '../contract_jsons';
import GenesisContractWrapper from './genesis_contract_wrapper';

export default class MultiplexerWrapper extends GenesisContractWrapper {
  constructor(multiplexerContractAddress, web3, defaultAddress) {
    super(multiplexerContractAddress, contractJsons.multiplexer, web3, defaultAddress);
  }

  async transferOwnership(newOwnerAddress) {
    return this.contract.methods.transferOwnership(newOwnerAddress).encodeABI();
  }

  async transferContractsOwnership(address) {
    return this.contract.methods.transferContractsOwnership(address).encodeABI();
  }

  async changeContext(contextAddress) {
    return this.contract.methods.changeContext(contextAddress).encodeABI();
  }

  async addToWhitelist(candidateAddress, role, deposit) {
    return this.contract.methods.addToWhitelist(candidateAddress, role, deposit).encodeABI();
  }

  async removeFromWhitelist(candidateAddress) {
    return this.contract.methods.removeFromWhitelist(candidateAddress).encodeABI();
  }

  async retireApollo(apolloAddress) {
    return this.contract.methods.retireApollo(apolloAddress).encodeABI();
  }

  async setBaseUploadFee(fee) {
    return this.contract.methods.setBaseUploadFee(fee).encodeABI();
  }

  async transferOwnershipForValidatorSet(address) {
    return this.contract.methods.transferOwnershipForValidatorSet(address).encodeABI();
  }

  async transferOwnershipForBlockRewards(address) {
    return this.contract.methods.transferOwnershipForBlockRewards(address).encodeABI();
  }

  async setBaseReward(newBaseReward) {
    return this.contract.methods.setBaseReward(newBaseReward).encodeABI();
  }

  async setDeveloper(developer) {
    return this.contract.methods.setDeveloper(developer).encodeABI();
  }

  async setDeveloperFee(developerFee) {
    return this.contract.methods.setDeveloperFee(developerFee).encodeABI();
  }

  async setSupportFee(support, fee) {
    return this.contract.methods.setSupportFee(support, fee).encodeABI();
  }

  async addAdmin(admin) {
    return this.contract.methods.addAdmin(admin).encodeABI();
  }

  async removeAdmin(admin) {
    return this.contract.methods.removeAdmin(admin).encodeABI();
  }

  async addPool(pool) {
    return this.contract.methods.addPool(pool).encodeABI();
  }

  async removePool(pool) {
    return this.contract.methods.removePool(pool).encodeABI();
  }

  async setUserRoles(roleHexes, userAddress) {
    return this.contract.methods.setUserRole(roleHexes, userAddress).encodeABI();
  }

  async setAdminRole(userAddress) {
    return this.contract.methods.setRole('DEFAULT_ADMIN_ROLE', userAddress).encodeABI();
  }

  async setFullRole(roleName, trueSelectors, falseSelectors) {
    return this.contract.methods.setFullRole(roleName, trueSelectors, falseSelectors).encodeABI();
  }
}
