/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class AdministrativeActions {
  constructor(headWrapper, kycWhitelistWrapper, feesWrapper, validatorProxyWrapper, blockchainStateWrapper) {
    this.headWrapper = headWrapper;
    this.kycWhitelistWrapper = kycWhitelistWrapper;
    this.feesWrapper = feesWrapper;
    this.validatorProxyWrapper = validatorProxyWrapper;
    this.blockchainStateWrapper = blockchainStateWrapper;
  }

  async moveOwnershipsToMultiplexer(multiplexerAddress) {
    await this.headWrapper.transferOwnership(multiplexerAddress);
    await this.kycWhitelistWrapper.transferOwnership(multiplexerAddress);
    await this.feesWrapper.transferOwnership(multiplexerAddress);
    await this.validatorProxyWrapper.transferOwnership(multiplexerAddress);
  }

  async switchContext(newContextAddress) {
    if (await this.headWrapper.getOwner() !== this.headWrapper.defaultAddress) {
      throw new Error('You need to be the owner of the Head contract to perform a context switch');
    }
    if (!await this.blockchainStateWrapper.isAddressAContract(newContextAddress)) {
      throw new Error('Provided address is not a contract');
    }
    await this.headWrapper.setContext(newContextAddress);
  }
}
