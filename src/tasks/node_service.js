/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';

export default class NodeServiceTask extends TaskBase {
  constructor(nodeAddress, nodeServiceActions) {
    super();
    this.nodeServiceActions = nodeServiceActions;
    this.nodeAddress = nodeAddress;
  }

  async execute([command, ...options]) {
    if (command === 'setUrl') {
      await this.setUrl(options[0]);
    } else {
      console.error('Unknown sub-command, use: yarn task nodeService [setUrl]');
      process.exit(1);
    }
  }

  printUsage() {
    console.log('\nUsage: yarn task nodeService [setUrl]');
  }

  async setUrl(url) {
    if (!url) {
      console.error(`Invalid parameter for url`);
      this.printUsage();
      process.exit(1);
      return;
    }
    await this.nodeServiceActions.setNodeUrl(this.nodeAddress, url);
  }

  help() {
    return {
      options: '[setUrl]',
      description: 'manages node settings post onboarding'
    };
  }
}
