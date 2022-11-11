/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {DEFAULT_GAS, loadContract} from '../utils/web3_tools';
import PoolJson from '../contracts/Pool.json';

export default class PoolActions {
  constructor(web3, poolsStoreWrapper, headContractAddress) {
    this.web3 = web3;
    this.headContractAddress = headContractAddress;
    this.poolsStoreWrapper = poolsStoreWrapper;
  }

  async createPool(name, minStake, fee, poolsServiceAddress, nodeStake, maxTotalStake) {
    const pool = await new this.web3.eth.Contract(PoolJson.abi, undefined, {
      gas: DEFAULT_GAS,
      gasPrice: this.web3.utils.toWei('5', 'gwei')
    }).deploy({data: PoolJson.bytecode, arguments: [name, 3, nodeStake, minStake, fee, poolsServiceAddress, this.headContractAddress, maxTotalStake]})
      .send({
        from: this.web3.eth.defaultAccount,
        gas: DEFAULT_GAS
      });
    console.log(name, ':', pool.options.address);
  }

  async getList() {
    const count = await this.poolsStoreWrapper.getPoolsCount();
    if (+count > 0) {
      const pools = await this.poolsStoreWrapper.getPools(0, count);
      for (const address of pools) {
        const contract = await loadContract(this.web3, PoolJson.abi, address);
        const name = await contract.methods.name().call();
        const id = await contract.methods.id().call();
        const active = await contract.methods.active().call();
        const totalStake = await contract.methods.totalStake().call();
        const nodeStake = await contract.methods.nodeStake().call();
        const nodesCount = +await contract.methods.getNodesCount().call();
        const token = +await contract.methods.token().call();
        let service;
        try {
          service = await contract.methods.service().call();
        // eslint-disable-next-line no-empty
        } catch (error) {
        }
        console.log(id, active ? 'active' : '      ', name, address, this.web3.utils.fromWei(nodeStake, 'ether'), nodesCount, this.web3.utils.fromWei(totalStake, 'ether'), token, service);
      }
    } else {
      console.log('No pools found');
    }
  }

  async getPoolNodesList(poolAddress) {
    const contract = await loadContract(this.web3, PoolJson.abi, poolAddress);
    const count = await contract.methods.getNodesCount().call();
    if (+count > 0) {
      const nodess = await contract.methods.getNodes(0, count).call();
      for (const address of nodess) {
        console.log(address);
      }
    } else {
      console.log('Empty pool');
    }
  }

  async activate(address, value) {
    const contract = await loadContract(this.web3, PoolJson.abi, address);
    console.log(await contract.methods.activate().send({gas: DEFAULT_GAS, value, from: this.web3.eth.defaultAccount}));
  }

  async deactivate(address) {
    const contract = await loadContract(this.web3, PoolJson.abi, address);
    console.log(await contract.methods.deactivate(0).send({gas: DEFAULT_GAS, from: this.web3.eth.defaultAccount}));
  }

  async stake(address, value) {
    const contract = await loadContract(this.web3, PoolJson.abi, address);
    console.log(await contract.methods.stake().send({gas: DEFAULT_GAS, value, from: this.web3.eth.defaultAccount}));
  }

  async unstake(address, value) {
    const contract = await loadContract(this.web3, PoolJson.abi, address);
    console.log(await contract.methods.unstake(value).send({gas: DEFAULT_GAS, from: this.web3.eth.defaultAccount}));
  }
}
