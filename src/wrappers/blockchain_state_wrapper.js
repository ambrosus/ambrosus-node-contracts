/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class BlockchainStateWrapper {
  constructor(web3) {
    this.web3 = web3;
  }

  async getBlockTimestamp(blockNumber) {
    const blockData = await this.web3.eth.getBlock(blockNumber);
    const {timestamp} = blockData;
    return timestamp;
  }

  async isAddressAContract(address) {
    return await this.web3.eth.getCode(address) !== '0x0';
  }

  async getBalance(address) {
    return this.web3.eth.getBalance(address);
  }

  async getCurrentBlockNumber() {
    return this.web3.eth.getBlockNumber();
  }
}
