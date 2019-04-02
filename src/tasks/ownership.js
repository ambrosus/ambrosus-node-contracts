/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import TaskBase from './base/task_base';
import {loadContract, utils} from '../utils/web3_tools';
import OwnableContractJson from '../contracts/Ownable';

export default class CheckOwnershipTask extends TaskBase {
  constructor(web3) {
    super();
    this.web3 = web3;
  }

  async execute(args) {
    const [contractAddress] = args;
    if (utils.isAddress(contractAddress)) {
      await this.getOwnership(contractAddress);
    } else {
      console.error('Wrong address, use: yarn task checkOwnership [contract address]');
      process.exit(1);
    }
  }

  async getOwnership(contractAddress) {
    const contract = loadContract(this.web3, OwnableContractJson.abi, contractAddress);
    console.log(await contract.methods.owner().call());
  }

  help() {
    return {
      description: 'check contract ownership'
    };
  }
}
