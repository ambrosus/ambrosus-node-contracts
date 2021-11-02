/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {DEFAULT_GAS, loadContract} from '../utils/web3_tools';
import PoolJson from '../contracts/Pool.json';

export default class PoolActions {
  constructor(web3, poolsStoreWrapper) {
    this.web3 = web3;
    this.poolsStoreWrapper = poolsStoreWrapper;
  }

  async getList() {
    const count = await this.poolsStoreWrapper.getPoolsCount();
    const pools = await this.poolsStoreWrapper.getPools(0, count);
    for (const address of pools) {
      const contract = await loadContract(this.web3, PoolJson.abi, address);
      const name = await contract.methods.name().call();
      const id = await contract.methods.id().call();
      const active = await contract.methods.active().call();
      const totalStake = await contract.methods.totalStake().call();
      console.log(id, active ? 'active' : '      ', name, address, this.web3.utils.fromWei(totalStake, 'ether'));
    }
  }

  async activate(address, value) {
    const contract = await loadContract(this.web3, PoolJson.abi, address);
    console.log(await contract.methods.activate().send({gas: DEFAULT_GAS, value, from: this.web3.eth.defaultAccount}));
  }

  async deactivate(address) {
    const contract = await loadContract(this.web3, PoolJson.abi, address);
    console.log(await contract.methods.deactivate().send({gas: DEFAULT_GAS, from: this.web3.eth.defaultAccount}));
  }

  async stake(address, value) {
    const contract = await loadContract(this.web3, PoolJson.abi, address);
    console.log(await contract.methods.stake().send({gas: DEFAULT_GAS, value, from: this.web3.eth.defaultAccount}));
  }

  async unstake(address, value) {
    const contract = await loadContract(this.web3, PoolJson.abi, address);
    console.log(await contract.methods.unstake(value).send({gas: DEFAULT_GAS, from: this.web3.eth.defaultAccount}));
  }

  async ownerUnstake(address) {
    const contract = await loadContract(this.web3, PoolJson.abi, address);
    console.log(await contract.methods.ownerUnstake().send({gas: DEFAULT_GAS, from: this.web3.eth.defaultAccount}));
  }
}
