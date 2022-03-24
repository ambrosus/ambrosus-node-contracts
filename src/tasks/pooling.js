/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import {utils} from '../utils/web3_tools';

export default class PoolingTask extends TaskBase {
  constructor(multisigActions, poolActions) {
    super();
    this.multisigActions = multisigActions;
    this.poolActions = poolActions;
  }

  async execute([command, ...options]) {
    if (command === 'pools') {
      await this.poolsList();
    } else if (command === 'create') {
      await this.createPool(options[0], options[1], options[2], options[3], options[4], options[5]);
    } else if (command === 'createWithLimits') {
      await this.createPoolWithLimits(options[0], options[1], options[2], options[3], options[4], options[5], options[6]);
    } else if (command === 'activate') {
      await this.activatePool(options[0], options[1]);
    } else if (command === 'deactivate') {
      await this.deactivatePool(options[0]);
    } else if (command === 'nodes') {
      await this.poolNodes(options[0]);
    } else if (command === 'stake') {
      await this.stake(options[0], options[1]);
    } else if (command === 'unstake') {
      await this.unstake(options[0], options[1]);
    } else {
      console.error('Unknown sub-command, see yarn task pooling help');
      process.exit(1);
    }
  }

  async createPool(name, minStake, fee, serviceAddress, nodeStake, maxTotalStake) {
    if (!utils.isAddress(serviceAddress)) {
      console.error('Wrong service address, use: yarn task pooling create [pool name, min stake, fee %, service address, node stake, max total stake]');
      return;
    }
    if (!name) {
      console.error('Wrong pool name, use: yarn task pooling create [pool name, min stake, fee %, service address, node stake, max total stake]');
      return;
    }
    if (!fee || +fee < 0 || +fee > 100) {
      console.error('Wrong fee value, use: yarn task pooling create [pool name, min stake, fee %, service address, node stake, max total stake]');
      return;
    }
    if (!minStake || +minStake < 0) {
      console.error('Wrong min stake value, use: yarn task pooling create [pool name, min stake, fee %, service address, node stake, max total stake]');
      return;
    }
    if (!nodeStake || +nodeStake < 0) {
      console.error('Wrong node stake value, use: yarn task pooling create [pool name, min stake, fee %, service address, node stake, max total stake]');
      return;
    }
    if (!maxTotalStake || +maxTotalStake < 0) {
      console.error('Wrong max total stake value, use: yarn task pooling create [pool name, min stake, fee %, service address, node stake, max total stake]');
      return;
    }
    return this.poolActions.createPool(
      name,
      this.poolActions.web3.utils.toWei(minStake, 'ether'),
      Math.floor((+fee) * 10000),
      serviceAddress,
      this.poolActions.web3.utils.toWei(nodeStake, 'ether'),
      this.poolActions.web3.utils.toWei(maxTotalStake, 'ether')
    );
  }

  async createPoolWithLimits(name, minStake, fee, serviceAddress, nodeStake, maxTotalStake, maxUserTotalStake) {
    if (!utils.isAddress(serviceAddress)) {
      console.error('Wrong service address, use: yarn task pooling create [pool name, min stake, fee %, service address, node stake, max total stake, max user total stake]');
      return;
    }
    if (!name) {
      console.error('Wrong pool name, use: yarn task pooling create [pool name, min stake, fee %, service address, node stake, max total stake, max user total stake]');
      return;
    }
    if (!fee || +fee < 0 || +fee > 100) {
      console.error('Wrong fee value, use: yarn task pooling create [pool name, min stake, fee %, service address, node stake, max total stake, max user total stake]');
      return;
    }
    if (!minStake || +minStake < 0) {
      console.error('Wrong min stake value, use: yarn task pooling create [pool name, min stake, fee %, service address, node stake, max total stake, max user total stake]');
      return;
    }
    if (!nodeStake || +nodeStake < 0) {
      console.error('Wrong node stake value, use: yarn task pooling create [pool name, min stake, fee %, service address, node stake, max total stake, max user total stake]');
      return;
    }
    if (!maxTotalStake || +maxTotalStake < 0) {
      console.error('Wrong max total stake value, use: yarn task pooling create [pool name, min stake, fee %, service address, node stake, max total stake, max user total stake]');
      return;
    }
    if (!maxUserTotalStake || +maxUserTotalStake < 0) {
      console.error('Wrong max user total stake value, use: yarn task pooling create [pool name, min stake, fee %, service address, node stake, max total stake, max user total stake]');
      return;
    }
    return this.poolActions.createPoolWithLimits(
      name,
      this.poolActions.web3.utils.toWei(minStake, 'ether'),
      Math.floor((+fee) * 10000),
      serviceAddress,
      this.poolActions.web3.utils.toWei(nodeStake, 'ether'),
      this.poolActions.web3.utils.toWei(maxTotalStake, 'ether'),
      this.poolActions.web3.utils.toWei(maxUserTotalStake, 'ether')
    );
  }

  async poolsList() {
    return this.poolActions.getList();
  }

  async activatePool(poolAddress, stake) {
    if (utils.isAddress(poolAddress)) {
      return this.poolActions.activate(poolAddress, this.poolActions.web3.utils.toWei(stake, 'ether'));
    }
    console.error('Wrong address, use: yarn task pooling activate [pool address, stake]');
  }

  async deactivatePool(poolAddress) {
    if (utils.isAddress(poolAddress)) {
      return this.poolActions.deactivate(poolAddress);
    }
    console.error('Wrong address, use: yarn task pooling deactivate [pool address]');
  }

  async poolNodes(poolAddress) {
    if (utils.isAddress(poolAddress)) {
      return this.poolActions.getPoolNodesListdeactivate(poolAddress);
    }
    console.error('Wrong address, use: yarn task pooling nodes [pool address]');
  }

  async stake(poolAddress, value) {
    if (utils.isAddress(poolAddress)) {
      return this.poolActions.stake(poolAddress, this.poolActions.web3.utils.toWei(value, 'ether'));
    }
    console.error('Wrong address, use: yarn task pooling stake [pool address, stake]');
  }

  async unstake(poolAddress, value) {
    if (utils.isAddress(poolAddress)) {
      return this.poolActions.unstake(poolAddress, this.poolActions.web3.utils.toWei(value, 'ether'));
    }
    console.error('Wrong address, use: yarn task pooling unstake [pool address, tokens]');
  }

  help() {
    return {
      options: '[create/pools/activate/deactivate/stake/unstake]',
      description: 'operations with pools'
    };
  }
}
