/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class WhitelistActions {
  constructor(kycWhitelistWrapper) {
    this.kycWhitelistWrapper = kycWhitelistWrapper;
  }

  async add(address, role, requiredDeposit) {
    const kycWhitelist = this.kycWhitelistWrapper;

    const owner = await kycWhitelist.getOwner();
    if (owner !== kycWhitelist.defaultAddress) {
      throw new Error('You need to be the owner of the KYC whitelist to perform a add action');
    }

    if (await kycWhitelist.isWhitelisted(address)) {
      throw new Error(`The provided address ${address} is already whitelisted`);
    }

    await kycWhitelist.add(address, role, requiredDeposit);
  }

  async remove(address) {
    const kycWhitelist = this.kycWhitelistWrapper;

    const owner = await kycWhitelist.getOwner();
    if (owner !== kycWhitelist.defaultAddress) {
      throw new Error('You need to be the owner of the KYC whitelist to perform this action');
    }

    if (!await kycWhitelist.isWhitelisted(address)) {
      throw new Error(`Address ${address} is not whitelisted`);
    }

    await kycWhitelist.remove(address);
  }

  async get(address) {
    const kycWhitelist = this.kycWhitelistWrapper;
    return {
      role: await kycWhitelist.getRoleAssigned(address),
      requiredDeposit: await kycWhitelist.getRequiredDeposit(address)
    };
  }

  async transferOwnership(newOwnerAddress) {
    const kycWhitelist = this.kycWhitelistWrapper;

    const owner = await kycWhitelist.getOwner();
    if (owner !== kycWhitelist.defaultAddress) {
      throw new Error('You need to be the owner of the KycWhitelist contract to be able to transfer ownership');
    }

    return kycWhitelist.transferOwnership(newOwnerAddress);
  }
}
