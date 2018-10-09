/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class WhitelistActions {
  constructor(kycWhitelistWrapper) {
    this.kycWhitelistWrapper = kycWhitelistWrapper;
  }

  async add(address, role, requiredDeposit) {
    const owner = await this.kycWhitelistWrapper.getOwner();
    if (owner !== this.kycWhitelistWrapper.defaultAddress) {
      throw new Error('You need to be the owner of the KYC whitelist to perform a add action');
    }

    if (await this.kycWhitelistWrapper.isWhitelisted(address)) {
      throw new Error(`The provided address ${address} is already whitelisted`);
    }

    await this.kycWhitelistWrapper.add(address, role, requiredDeposit);
  }

  async remove(address) {
    const owner = await this.kycWhitelistWrapper.getOwner();
    if (owner !== this.kycWhitelistWrapper.defaultAddress) {
      throw new Error('You need to be the owner of the KYC whitelist to perform this action');
    }

    if (!await this.kycWhitelistWrapper.isWhitelisted(address)) {
      throw new Error(`Address ${address} is not whitelisted`);
    }

    await this.kycWhitelistWrapper.remove(address);
  }
}
