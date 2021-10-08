/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ContractWrapper from './contract_wrapper';
import {loadContract} from '../utils/web3_tools';
import {pool} from '../contract_jsons';

export default class PoolWrapper extends ContractWrapper {
  constructor(contractAddress, web3, defaultAddress) {
    super(web3, defaultAddress);
    this.address = contractAddress;
    this.contract = loadContract(web3, pool.abi, contractAddress);
  }

  async getNodes() {
    return this.contract.methods.nodes().call();
  }

  async addNode(address) {
    return this.processTransaction(this.contract.methods.addNode(address));
  }
}
