/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import contractJsons, {contractSuperSpeedJsons} from '../contract_jsons';
import {version} from '../../package';
import {DEFAULT_BLOCK_RATE} from '../constants';
import {convertRateToBaseReward} from '../utils/block_reward_functions';

export default class DeployActions {
  constructor(deployer, headWrapper, validatorSetWrapper, blockRewardsWrapper, validatorProxyWrapper) {
    this.deployer = deployer;
    this.sender = this.deployer.sender;
    this.headWrapper = headWrapper;
    this.validatorSetWrapper = validatorSetWrapper;
    this.blockRewardsWrapper = blockRewardsWrapper;
    this.validatorProxyWrapper = validatorProxyWrapper;
    this.defaultBlockReward = convertRateToBaseReward(DEFAULT_BLOCK_RATE);
  }

  async deployGenesis(initialValidators, baseReward = this.defaultBlockReward) {
    const {head: headJson, validatorSet: validatorSetJson, blockRewards: blockRewardsJson} = contractJsons;
    const head = await this.deployer.deployContract(headJson, [this.sender], {});
    const validatorSet = await this.deployer.deployContract(validatorSetJson, [this.sender, initialValidators, this.sender], {});
    const blockRewards = await this.deployer.deployContract(blockRewardsJson, [this.sender, baseReward, this.sender], {});
    return {head, validatorSet, blockRewards};
  }

  async deployInitial(turbo = false) {
    const overrides = turbo ? contractSuperSpeedJsons : {};
    const contractsToDeploy = {...contractJsons, ...overrides};
    const genesisContracts = {
      head: this.headWrapper.address(),
      validatorSet: this.validatorSetWrapper.address(),
      blockRewards: this.blockRewardsWrapper.address()
    };
    return this.deployer.deploy(contractsToDeploy, genesisContracts, [], {multiplexer: {owner: this.sender}}, version);
  }

  async deployUpdate(turbo = false) {
    const overrides = turbo ? contractSuperSpeedJsons : {};
    const contractsToDeploy = {...contractJsons, ...overrides};
    const recycledContracts = await this.recycleStorageContracts();
    const genesisContracts = {
      head: this.headWrapper.address(),
      validatorSet: this.validatorSetWrapper.address(),
      blockRewards: this.blockRewardsWrapper.address()
    };
    await this.regainGenesisContractsOwnership();
    return this.deployer.deploy(contractsToDeploy, {...genesisContracts, ...recycledContracts}, [], {multiplexer: {owner: this.sender}}, version);
  }

  async recycleStorageContracts() {
    const storageContractNames = this.headWrapper.availableStorageCatalogueContracts;
    const recycled = {};
    for (const contractName of storageContractNames) {
      recycled[contractName] = await this.headWrapper.contractAddressByName(contractName);
    }
    return recycled;
  }

  async regainGenesisContractsOwnership() {
    const validatorProxyOwner = await this.validatorProxyWrapper.getOwner();
    const validatorProxyAddress = await this.validatorProxyWrapper.address();

    const validatorSetOwner = await this.validatorSetWrapper.getOwner();
    if (validatorSetOwner === this.sender) {
      // nothing to do
    } else if (validatorProxyOwner === this.sender && validatorSetOwner === validatorProxyAddress) {
      await this.validatorProxyWrapper.transferOwnershipForValidatorSet(this.sender);
    } else {
      throw `Failed to regain ownership for validator set contract from it's current owner: ${validatorSetOwner}`;
    }

    const blockRewardsOwner = await this.blockRewardsWrapper.getOwner();
    if (blockRewardsOwner === this.sender) {
      // nothing to do
    } else if (validatorProxyOwner === this.sender && blockRewardsOwner === validatorProxyAddress) {
      await this.validatorProxyWrapper.transferOwnershipForBlockRewards(this.sender);
    } else {
      throw `Failed to regain ownership for block rewards contract from it's current owner: ${blockRewardsOwner}`;
    }
  }
}
