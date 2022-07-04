/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import ContractWrapper from './contract_wrapper';
import {loadContract} from '../utils/web3_tools';
import contractJsons from '../contract_jsons';

export default class RolesScopes extends ContractWrapper {
  roles = {
    SUPPORT_MANAGER: ['addToWhitelist', 'removeFromWhitelist']
  }
  constructor(rolesScopesContractAddress, web3, defaultAddress) {
    super(web3, defaultAddress);
    this.address = rolesScopesContractAddress;
    this.contract = loadContract(web3, contractJsons.rolesScopes.abi, rolesScopesContractAddress);
    this.setUpPredefinedRoles();
  }

  async setRole(roleName, role, hasPrivilage) {
    return this.contract.methods.setRole(roleName, role, hasPrivilage).call();
  }

  async getAllMultiplexerSelectors() {
    const selectors = {};
    selectors.transferContractsOwnership = await this.web3.eth.abi.encodeFunctionSignature('transferContractsOwnership(address)');
    selectors.changeContext = await this.web3.eth.abi.encodeFunctionSignature('changeContext(Context)');
    selectors.addToWhitelist = await this.web3.eth.abi.encodeFunctionSignature('addToWhitelist(address,Consts.NodeType,uint)');
    selectors.removeFromWhitelist = await this.web3.eth.abi.encodeFunctionSignature('removeFromWhitelist(address)');
    selectors.setBaseUploadFee = await this.web3.eth.abi.encodeFunctionSignature('setBaseUploadFee(uint)');
    selectors.transferOwnershipForValidatorSet =  await this.web3.eth.abi.encodeFunctionSignature('transferOwnershipForValidatorSet(address)');
    selectors.transferOwnershipForBlockRewards =  await this.web3.eth.abi.encodeFunctionSignature('transferOwnershipForBlockRewards(address)');
    selectors.setBaseReward = await this.web3.eth.abi.encodeFunctionSignature('setBaseReward(uint256)');
    selectors.retireApollo =  await this.web3.eth.abi.encodeFunctionSignature('retireApollo(address)');
    selectors.setDeveloperFee = await this.web3.eth.abi.encodeFunctionSignature('setDeveloperFee(uint256)');
    selectors.setDeveloper = await this.web3.eth.abi.encodeFunctionSignature('setDeveloper(address)');
    selectors.setSupportFee = await this.web3.eth.abi.encodeFunctionSignature('setSupportFee(address,uint256)');
    selectors.addAdmin = await this.web3.eth.abi.encodeFunctionSignature('addAdmin(address)');
    selectors.removeAdmin = await this.web3.eth.abi.encodeFunctionSignature('removeAdmin(address)');
    selectors.addPool = await this.web3.eth.abi.encodeFunctionSignature('addPool(address)');
    selectors.removePool = await this.web3.eth.abi.encodeFunctionSignature('removePool(address)');
    return selectors;
  }

  async setUpPredefinedRoles() {
    const selectors = await this.getAllMultiplexerSelectors();

    // setup SUPPORT_MANAGER ROLE
    for (const key of Object.keys(selectors)) {
      // setup SUPPORT_MANAGER ROLE
      if (key in this.roles.SUPPORT_MANAGER) {
        await this.setRole('SUPPORT_MANAGER', selectors[key], true);
      } else {
        await this.setRole('SUPPORT_MANAGER', selectors[key], false);
      }
      // setup DEFAULT_ADMIN_ROLE
      await this.setRole('DEFAULT_ADMIN_ROLE', selectors[key], true);
    }
  }
}
