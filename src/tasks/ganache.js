/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import {createGanacheServer} from '../utils/web3_tools';
import {getConfig} from '../config';
import fs from 'fs';

export default class GanacheTask extends TaskBase {
  async execute() {
    this.savePidFile();
    await createGanacheServer(getConfig().web3.nodePrivateKey);
  }

  savePidFile() {
    const filename = './ganache.pid';
    fs.writeFile(filename, process.pid, (err) => {
      if (err) {
        console.error(`Unable to save pid file ${filename}: ${err}`);
      }
    });
  }

  description() {
    return '                                  - run test RPC mock, with properly predefined accounts for development and testing';
  }
}
