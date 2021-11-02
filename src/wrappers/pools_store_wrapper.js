/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ManagedContractWrapper from './managed_contract_wrapper';

export default class PoolsStoreWrapper extends ManagedContractWrapper {
  get getContractName() {
    return 'poolsStore';
  }

  async poolsAdded(fromBlock, toBlock) {
    const contract = await this.contract();
    return contract.getPastEvents('PoolAdded', {fromBlock, toBlock});
  }

  async poolsRemoved(fromBlock, toBlock) {
    const contract = await this.contract();
    return contract.getPastEvents('PoolRemoved', {fromBlock, toBlock});
  }

  async getPoolsCount() {
    const contract = await this.contract();
    return contract.methods.getPoolsCount().call();
  }

  async getPool(idx) {
    const contract = await this.contract();
    return contract.methods.pools(idx).call();
  }

  async getPools(from, to) {
    const contract = await this.contract();
    return contract.methods.getPools(from, to).call();
  }
}
