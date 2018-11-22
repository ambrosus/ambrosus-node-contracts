/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import contractJsons, {contractSuperSpeedJsons} from '../contract_jsons';

/**
 * Computed as:
 * floor((Total AMB supply) * 2% / (blocks/year))
 */
const DEFAULT_BLOCK_REWARD = '1146237435108134836';

export default class DeployActions {
  constructor(deployer) {
    this.deployer = deployer;
    this.sender = this.deployer.sender;
  }

  async deployGenesis(initialValidators, baseReward = DEFAULT_BLOCK_REWARD) {
    const {head: headJson, validatorSet: validatorSetJson, blockRewards: blockRewardsJson} = contractJsons;
    const head = await this.deployer.deployContract(headJson, [this.sender], {});
    const validatorSet = await this.deployer.deployContract(validatorSetJson, [this.sender, initialValidators, this.sender], {});
    const blockRewards = await this.deployer.deployContract(blockRewardsJson, [this.sender, baseReward, this.sender], {});
    return {head, validatorSet, blockRewards};
  }

  async deployAll(head, validatorSet, blockRewards, turbo = false) {
    const overrides = turbo ? contractSuperSpeedJsons : {};
    const contractsToDeploy = {...contractJsons, ...overrides};
    return this.deployer.deploy(contractsToDeploy, {head, validatorSet, blockRewards});
  }
}
