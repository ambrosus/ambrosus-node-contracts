/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import Deployer from '../deployer';
import {createWeb3} from '../web3_tools';

export default class DeployTask extends TaskBase {
  async execute() {
    console.log('Deploying contracts. This may take some time...');
    this.web3 = await createWeb3();
    const deployer = new Deployer(this.web3);  
    const addresses = await deployer.deploy();
    this.printSummary(addresses);
  }

  printSummary(addresses) {
    const addressConfig = Object.keys(addresses)
      .map((key) => [key, addresses[key].options.address])
      .reduce((object, [key, value]) => { 
        object[key] = value; 
        return object; 
      }, {});
    console.log(addressConfig);
  }

  description() {
    return '                                - deploys all contracts';
  }
}
