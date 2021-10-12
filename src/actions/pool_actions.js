/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {DEFAULT_GAS, loadContract} from '../utils/web3_tools';
import PoolJson from '../contracts/Pool.json';

export default class PoolActions {
  constructor(web3) {
    this.web3 = web3;
  }

  async activate(address, value) {
    const contract = await loadContract(this.web3, PoolJson.abi, address);
    console.log(await contract.methods.activate().send({gas: DEFAULT_GAS, value, from: this.web3.eth.defaultAccount}));
  }
}
