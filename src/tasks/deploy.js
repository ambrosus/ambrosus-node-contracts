/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import Deployer from '../deployer';
import {createWeb3} from '../web3_tools';
import {getConfig, getConfigFilePath, getConfigFilePathFromRoot} from '../config';
import fs from 'fs';

export default class DeployTask extends TaskBase {
  async execute(args) {
    console.log('Deploying contracts. This may take some time...');
    this.web3 = await createWeb3();
    const deployer = new Deployer(this.web3);  
    const addresses = await deployer.deploy();
    const config = this.addressesToConfig(addresses);
    if (args[0] === '--save-config') {
      this.saveConfiguration(config);
    } else {
      this.printSummary(config);
    }
  }

  saveConfiguration(config) {
    const filePath = getConfigFilePathFromRoot();
    fs.writeFile(filePath, JSON.stringify(config, null, 2), (error) => {
      if (error) {
        console.error(`Unable to save configuration: ${error}`);
      } else {        
        console.log(`Contracts deployed, configuration saved to ${filePath}.`);      
      }
    }); 
  }
  
  printSummary(config) {
    console.log(`Contracts deployed, save following configuration to ${getConfigFilePath()} to start using them:`);
    console.log(config);      
  }
  
  addressesToConfig(addresses) {
    const contracts = Object.keys(addresses)
      .map((key) => [key, addresses[key].options.address])
      .reduce((object, [key, value]) => { 
        object[key] = value; 
        return object; 
      }, {});
    return {...getConfig(), contracts};  
  }

  description() {
    return '                                - deploys all contracts';
  }
}
