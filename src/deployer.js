/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BundleRegistryJson from '../build/contracts/BundleRegistry.json';
import StakeStoreJson from '../build/contracts/StakeStore.json';
import BundleStoreJson from '../build/contracts/BundleStore.json';
import HeadJson from '../build/contracts/Head.json';
import RolesJson from '../build/contracts/Roles.json';
import StakesJson from '../build/contracts/Stakes.json';
import ContextJson from '../build/contracts/Context.json';
import KycWhitelistJson from '../build/contracts/KycWhitelist.json';
import FeesJson from '../build/contracts/Fees.json';
import ChallengesJson from '../build/contracts/Challenges.json';
import ShelteringJson from '../build/contracts/Sheltering.json';

import {DEFAULT_GAS, deployContract, getDefaultAddress} from './web3_tools';

const DEFAULT_CONTRACT_JSONS = {
  bundleRegistry: BundleRegistryJson,
  stakeStore: StakeStoreJson,
  roles: RolesJson,
  stakes: StakesJson,
  bundleStore: BundleStoreJson,
  kycWhitelist: KycWhitelistJson,
  sheltering: ShelteringJson,
  fees: FeesJson,
  challenges: ChallengesJson
};

export default class Deployer {
  constructor(web3, from = getDefaultAddress(web3), gas = DEFAULT_GAS) {
    this.web3 = web3;
    this.from = from;
    this.gas = gas;
  }
  
  async setupContext(adresses) {
    const context = await deployContract(this.web3, ContextJson, adresses);
    await this.head.methods.setContext(context.options.address).send({
      gas: this.gas,
      from: this.from
    });
    return context;
  }
  
  async deployOne(customContractJson, defaultJson) {    
    if (!customContractJson) {
      return;      
    } 
    const contractJson = customContractJson === true ? defaultJson : customContractJson;
    return deployContract(this.web3, contractJson, [this.head.options.address]);
  }

  getDefaultArgs() {
    const pairs = Object.entries(DEFAULT_CONTRACT_JSONS)
      .map(([contractName]) => ({[contractName]: true}));      
    return Object.assign(...pairs);
  }

  async deployCustom(contractJsonsOrBooleans) {    
    const defaults = DEFAULT_CONTRACT_JSONS;
    const result = {};
    for (const [contractName, jsonOrBoolean] of Object.entries(contractJsonsOrBooleans)) {
      result[contractName] = await this.deployOne(jsonOrBoolean, defaults[contractName]);
    }    
    return result;
  }



  async deploy(contractJsonsOrBooleans = this.getDefaultArgs()) {
    function contractToAddress (contract) {
      return contract ? contract.options.address : '0x0';
    }

    function prepareArgs (contractMap) {
      return [contractMap.bundleRegistry, contractMap.stakeStore, contractMap.bundleStore, contractMap.kycWhitelist, contractMap.roles, contractMap.stakes, contractMap.sheltering, contractMap.fees, contractMap.challenges]
        .map((contract) => contractToAddress(contract));
    }
    this.head = await deployContract(this.web3, HeadJson);
    const contractMap = await this.deployCustom(contractJsonsOrBooleans);
    const context = await this.setupContext(prepareArgs(contractMap));
    return {head: this.head, context, ...contractMap};
  }
}
