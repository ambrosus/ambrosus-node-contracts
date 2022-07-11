/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ManagedContractWrapper from './managed_contract_wrapper';

export default class RolesPrivilagesStore extends ManagedContractWrapper {
  get getContractName() {
    return 'rolesPrivilagesStore';
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
}
