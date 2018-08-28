/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import SafeMathExtensionsJson from '../build/contracts/SafeMathExtensions.json';
import AtlasStakeStoreJson from '../build/contracts/AtlasStakeStore.json';
import BundleStoreJson from '../build/contracts/BundleStore.json';
import HeadJson from '../build/contracts/Head.json';
import RolesJson from '../build/contracts/Roles.json';
import ContextJson from '../build/contracts/Context.json';
import KycWhitelistJson from '../build/contracts/KycWhitelist.json';
import FeesJson from '../build/contracts/Fees.json';
import ChallengesJson from '../build/contracts/Challenges.json';
import ShelteringJson from '../build/contracts/Sheltering.json';
import PayoutsStoreJson from '../build/contracts/PayoutsStore.json';
import RolesStoreJson from '../build/contracts/RolesStore.json';
import PayoutsJson from '../build/contracts/Payouts.json';
import ShelteringTransfersJson from '../build/contracts/ShelteringTransfers.json';
import TimeJson from '../build/contracts/Time.json';
import ConfigJson from '../build/contracts/Config.json';
import UploadsJson from '../build/contracts/Uploads.json';
import ApolloDepositStoreJson from '../build/contracts/ApolloDepositStore.json';

import {DEFAULT_GAS, deployContract, loadContract, getDefaultAddress, link} from './web3_tools';

const DEFAULT_CONTRACT_JSONS = {
  time: TimeJson,
  atlasStakeStore: AtlasStakeStoreJson,
  roles: RolesJson,
  bundleStore: BundleStoreJson,
  kycWhitelist: KycWhitelistJson,
  sheltering: ShelteringJson,
  fees: FeesJson,
  challenges: ChallengesJson,
  payoutsStore: PayoutsStoreJson,
  payouts: PayoutsJson,
  shelteringTransfers: ShelteringTransfersJson,
  config: ConfigJson,
  uploads: UploadsJson,
  rolesStore: RolesStoreJson,
  apolloDepositStore: ApolloDepositStoreJson
};

const getContractConstructor = (contractJson) => contractJson.abi.find((value) => value.type === 'constructor');

export default class Deployer {
  constructor(web3, from = getDefaultAddress(web3), gas = DEFAULT_GAS) {
    this.web3 = web3;
    this.from = from;
    this.gas = gas;
    this.contextConstructorParams = getContractConstructor(ContextJson)
      .inputs
      .map((input) => input.name.slice(1));

    if (!this.contextConstructorParams.every((key) => DEFAULT_CONTRACT_JSONS[key] !== undefined)) {
      throw 'DEFAULT_CONTRACT_JSONS is missing a key for a context parameter';
    }
  }

  getDefaultArgs() {
    const pairs = Object.entries(DEFAULT_CONTRACT_JSONS)
      .map(([contractName]) => ({[contractName]: true}));
    return Object.assign(...pairs);
  }

  async setupContext(addresses) {
    const context = await deployContract(this.web3, ContextJson, addresses, {from: this.from});
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
    for (const lib of Object.entries(this.libs)) {
      const [libName, libContract] = lib;
      link(contractJson, libName, libContract);
    }

    // Detect Base based contracts, and provide the _head address as a parameter
    const constructorArgs = [];
    const constructor = getContractConstructor(contractJson);
    if (constructor !== undefined && constructor.inputs.find((input) => input.name === '_head' && input.type === 'address') !== undefined) {
      constructorArgs.push(this.head.options.address);
    }

    return deployContract(this.web3, contractJson, constructorArgs, {from: this.from});
  }

  async deployLibs() {
    this.libs = {SafeMathExtensions: await deployContract(this.web3, SafeMathExtensionsJson, [], {from: this.from})};
  }

  async deployCustom(contractJsonsOrBooleans) {
    const defaults = DEFAULT_CONTRACT_JSONS;
    const result = {};
    for (const [contractName, jsonOrBoolean] of Object.entries(contractJsonsOrBooleans)) {
      result[contractName] = await this.deployOne(jsonOrBoolean, defaults[contractName]);
    }
    return result;
  }

  async loadHead(headAddress) {
    this.head = await loadContract(this.web3, HeadJson.abi, headAddress);
  }

  async deployHead() {
    this.head = await deployContract(this.web3, HeadJson, [this.from], {from: this.from});
  }

  async deploy(contractJsonsOrBooleans = this.getDefaultArgs()) {
    const contractToAddress = (contract) => (contract ? contract.options.address : '0x0');
    const prepareArgs = (contractMap) => this.contextConstructorParams.map((key) => contractToAddress(contractMap[key]));
    await this.deployLibs();
    if (!this.head) {
      await this.deployHead();
    }
    const contractMap = await this.deployCustom(contractJsonsOrBooleans);
    const context = await this.setupContext(prepareArgs(contractMap));
    return {head: this.head, context, ...contractMap};
  }
}
