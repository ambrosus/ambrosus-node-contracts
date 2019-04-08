/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import contractJsons from '../contract_jsons';
import GenesisContractWrapper from './genesis_contract_wrapper';

export default class MultiplexerWrapper extends GenesisContractWrapper {
  constructor(multiplexerContractAddress, web3, defaultAddress) {
    super(multiplexerContractAddress, contractJsons.multiplexer, web3, defaultAddress);
  }

  async transferContractsOwnership(address) {
    return this.processTransaction(this.contract.methods.transferContractsOwnership(address));
  }

  async changeContext(contextAddress) {
    return this.processTransaction(this.contract.methods.changeContext(contextAddress));
  }

  async addToWhitelist(candidateAddress, role, deposit) {
    return this.processTransaction(this.contract.methods.addToWhitelist(candidateAddress, role, deposit));
  }

  async removeFromWhitelist(candidateAddress) {
    return this.processTransaction(this.contract.methods.removeFromWhitelist(candidateAddress));
  }

  async setBaseUploadFee(fee) {
    return this.processTransaction(this.contract.methods.setBaseUploadFee(fee));
  }

  async transferOwnershipForValidatorSet(address) {
    return this.processTransaction(this.contract.methods.transferOwnershipForValidatorSet(address));
  }

  async transferOwnershipForBlockRewards(address) {
    return this.processTransaction(this.contract.methods.transferOwnershipForBlockRewards(address));
  }
}
