/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import {utils} from '../utils/web3_tools';

export default class MoveOwnershipToMultiplexerTask extends TaskBase {
  constructor(adminActions) {
    super();
    this.adminActions = adminActions;
  }

  async execute(args) {
    const [newOwnerAddress] = args;
    if (utils.isAddress(newOwnerAddress)) {
      await this.setOwnerships(newOwnerAddress);
    } else {
      console.error('Wrong address, use: yarn task moveOwnershipToMultiplexer [address]');
      process.exit(1);
    }
  }

  async setOwnerships(newOwnerAddress) {
    return this.adminActions.moveOwnershipsToMultiplexer(newOwnerAddress);
  }

  help() {
    return {
      description: 'transfer contracts ownerships to the multiplexer contract'
    };
  }
}
