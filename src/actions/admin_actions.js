/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class AdministrativeActions {
  constructor(headWrapper, blockchainStateWrapper) {
    this.headWrapper = headWrapper;
    this.blockchainStateWrapper = blockchainStateWrapper;
  }

  async switchContext(newContextAddress) {
    if (await this.headWrapper.getOwner() !== this.headWrapper.defaultAddress) {
      throw new Error('You need to be the owner of the Head contract to be able to switch context');
    }
    if (!await this.blockchainStateWrapper.isAddressAContract(newContextAddress)) {
      throw new Error('Provided context address is not a contract address');
    }
    await this.headWrapper.setContext(newContextAddress);
  }
}
