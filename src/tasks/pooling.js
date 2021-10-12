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
    if (command === 'add') {
      await this.addPool(options[0]);
    } else if (command === 'activate') {
      await this.activatePool(options[0], options[1]);
    } else {
      console.error('Unknown sub-command, see yarn task pooling help');
      process.exit(1);
    }
  }

  async addPool(poolAddress) {
    if (utils.isAddress(poolAddress)) {
      return this.multisigActions.addPool(poolAddress);
    }
    console.error('Wrong address, use: yarn task pooling add [pool address]');
  }

  async activatePool(poolAddress, stake) {
    if (utils.isAddress(poolAddress)) {
      return this.poolActions.activate(poolAddress, this.poolActions.web3.utils.toWei(stake, 'ether'));
    }
    console.error('Wrong address, use: yarn task pooling activate [pool address]');
  }

  help() {
    return {
      description: 'add new pool to manager'
    };
  }
}
