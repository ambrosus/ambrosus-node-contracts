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
    } else if (command === 'activate') {
      await this.activatePool(options[0], options[1]);
    } else if (command === 'deactivate') {
      await this.deactivatePool(options[0]);
    } else if (command === 'stake') {
      await this.stake(options[0], options[1]);
    } else if (command === 'unstake') {
      await this.unstake(options[0], options[1]);
    } else if (command === 'ownerUnstake') {
      await this.ownerUnstake(options[0]);
    } else {
      console.error('Unknown sub-command, see yarn task pooling help');
      process.exit(1);
    }
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

  async ownerUnstake(poolAddress) {
    if (utils.isAddress(poolAddress)) {
      return this.poolActions.ownerUnstake(poolAddress);
    }
    console.error('Wrong address, use: yarn task pooling ownerUnstake [pool address]');
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
      options: '[pools/activate/deactivate/ownerUnstake/stake/unstake]',
      description: 'operations with pools'
    };
  }
}
