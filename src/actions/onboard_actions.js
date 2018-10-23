/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {ATLAS, HERMES, APOLLO, ROLE_REVERSE_CODES} from '../consts';

export default class OnboardActions {
  constructor(kycWhitelistWrapper, rolesWrapper) {
    this.kycWhitelistWrapper = kycWhitelistWrapper;
    this.rolesWrapper = rolesWrapper;
  }

  async onboardAsAtlas(address, url, stakeAmount) {
    await this.validateWhitelistedForRole(address, ATLAS);
    await this.validateStakeDepositAmount(address, stakeAmount);
    const roles = this.rolesWrapper;
    await roles.onboardAsAtlas(address, url, stakeAmount);
  }

  async onboardAsHermes(address, url) {
    await this.validateWhitelistedForRole(address, HERMES);
    const roles = this.rolesWrapper;
    await roles.onboardAsHermes(address, url);
  }

  async onboardAsApollo(address, depositAmount) {
    await this.validateWhitelistedForRole(address, APOLLO);
    await this.validateStakeDepositAmount(address, depositAmount);
    const roles = this.rolesWrapper;
    await roles.onboardAsApollo(address, depositAmount);
  }

  async getOnboardedRole(address) {
    const roles = this.rolesWrapper;
    return roles.onboardedRole(address);
  }

  async validateWhitelistedForRole(address, role) {
    const kyc = this.kycWhitelistWrapper;

    if (!await kyc.hasRoleAssigned(address, role)) {
      throw new Error(`Address ${address} is not white-listed for the ${ROLE_REVERSE_CODES[role]} role.`);
    }
  }

  async validateStakeDepositAmount(address, amount) {
    const kyc = this.kycWhitelistWrapper;
    const requiredAmount = await kyc.getRequiredDeposit(address);

    if (amount.toString() !== requiredAmount.toString()) {
      throw new Error(`Address ${address} requires a deposit of ${requiredAmount} but ${amount} provided.`);
    }
  }
}
