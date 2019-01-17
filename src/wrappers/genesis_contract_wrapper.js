/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {loadContract} from '../utils/web3_tools';

export default class GenesisContractWrapper {
  constructor(address, contractJson, web3, defaultAddress) {
    if (address === undefined) {
      throw new Error('address is not configured');
    }

    this.web3 = web3;
    this.defaultAddress = defaultAddress;
    this.contract = loadContract(this.web3, contractJson.abi, address);
  }

  setDefaultAddress(defaultAddress) {
    this.defaultAddress = defaultAddress;
  }

  async getOwner() {
    return this.contract.methods.owner().call();
  }

  async transferOwnership(newOwnerAddress) {
    return this.contract.methods.transferOwnership(newOwnerAddress).send({from: this.defaultAddress});
  }

  address() {
    return this.contract.options.address;
  }
}
