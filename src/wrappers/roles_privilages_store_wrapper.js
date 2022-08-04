/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ManagedContractWrapper from './managed_contract_wrapper';

export default class RolesPrivilagesStoreWrapper extends ManagedContractWrapper {
  get getContractName() {
    return 'rolesPrivilagesStore';
  }

  async getAllMultiplexerSelectors() {
    const selectors = {};
    selectors.addToWhitelist = await this.web3.eth.abi.encodeFunctionSignature('addToWhitelist(address,Consts.NodeType,uint256)');
    selectors.removeFromWhitelist = await this.web3.eth.abi.encodeFunctionSignature('removeFromWhitelist(address)');
    selectors.setBaseUploadFee = await this.web3.eth.abi.encodeFunctionSignature('setBaseUploadFee(uint256)');
    selectors.setBaseReward = await this.web3.eth.abi.encodeFunctionSignature('setBaseReward(uint256)');
    selectors.retireApollo =  await this.web3.eth.abi.encodeFunctionSignature('retireApollo(address)');
    selectors.setDeveloperFee = await this.web3.eth.abi.encodeFunctionSignature('setDeveloperFee(uint256)');
    selectors.setDeveloper = await this.web3.eth.abi.encodeFunctionSignature('setDeveloper(address)');
    selectors.setSupportFee = await this.web3.eth.abi.encodeFunctionSignature('setSupportFee(address,uint256)');
    selectors.addAdmin = await this.web3.eth.abi.encodeFunctionSignature('addAdmin(address)');
    selectors.removeAdmin = await this.web3.eth.abi.encodeFunctionSignature('removeAdmin(address)');
    selectors.addPool = await this.web3.eth.abi.encodeFunctionSignature('addPool(address)');
    selectors.removePool = await this.web3.eth.abi.encodeFunctionSignature('removePool(address)');
    selectors.setRole = await this.web3.eth.abi.encodeFunctionSignature('setRole(string,bytes4[],bytes4[]))');
    selectors.setRoles = await this.web3.eth.abi.encodeFunctionSignature('setRoles(address,bytes32[]))');

    return selectors;
  }

  async hasPrivilage(user, selector) {
    const contract = await this.contract();
    return contract.methods.hasPrivilage(user, selector).call();
  }

  async hasRolePrivilage(roleHex, selector) {
    const contract = await this.contract();
    return contract.methods.hasRolePrivilage(roleHex, selector).call();
  }

  async getRoleNameByHex(roleHex) {
    const contract = await this.contract();
    return contract.methods.getRoleNameByHex(roleHex).call();
  }

  async getRoleHexByName(roleName) {
    const contract = await this.contract();
    return contract.methods.getRoleHexByName(roleName).call();
  }

  async getRoleHexes() {
    const contract = await this.contract();
    return contract.methods.getRoleHexes().call();
  }

  async getRoles(account) {
    const contract = await this.contract();
    return contract.methods.getRoles(account).call();
  }
}
