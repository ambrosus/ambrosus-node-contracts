/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ManagedContractWrapper from './managed_contract_wrapper';

export default class NodeAddressesStoreWrapper extends ManagedContractWrapper {
  get getContractName() {
    return 'nodeAddressesStore';
  }

  async nodeAddressesAdded(fromBlock, toBlock) {
    const contract = await this.contract();
    return contract.getPastEvents('NodeAddressesAdded', {fromBlock, toBlock});
  }

  async nodeAddressesRemoved(fromBlock, toBlock) {
    const contract = await this.contract();
    return contract.getPastEvents('NodeAddressesRemoved', {fromBlock, toBlock});
  }
}
