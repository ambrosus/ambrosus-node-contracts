/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {APOLLO, ATLAS, HERMES, ROLE_REVERSE_CODES} from '../constants';
import {utils} from '../utils/web3_tools';

export default class OnboardActions {
  constructor(kycWhitelistWrapper, rolesWrapper, atlasStakeWrapper) {
    this.kycWhitelistWrapper = kycWhitelistWrapper;
    this.rolesWrapper = rolesWrapper;
    this.atlasStakeWrapper = atlasStakeWrapper;
  }

  async onboardAsAtlas(address, stakeAmount, url) {
    await this.validateWhitelistedForRole(address, ATLAS);
    await this.validateAtlasStakeAmount(address, stakeAmount);
    const roles = this.rolesWrapper;
    await roles.onboardAsAtlas(address, stakeAmount, url);
  }

  async onboardAsHermes(address, url) {
    await this.validateWhitelistedForRole(address, HERMES);
    const roles = this.rolesWrapper;
    await roles.onboardAsHermes(address, url);
  }

  async onboardAsApollo(address, depositAmount) {
    await this.validateWhitelistedForRole(address, APOLLO);
    await this.validateApolloDepositAmount(address, depositAmount);
    const roles = this.rolesWrapper;
    await roles.onboardAsApollo(address, depositAmount);
  }

  async getOnboardedRole(address) {
    const roles = this.rolesWrapper;
    return {
      role: await roles.onboardedRole(address),
      url: await roles.nodeUrl(address)
    };
  }

  async validateWhitelistedForRole(address, role) {
    const kyc = this.kycWhitelistWrapper;

    if (!await kyc.hasRoleAssigned(address, role)) {
      throw new Error(`Address ${address} is not white-listed for the ${ROLE_REVERSE_CODES[role]} role.`);
    }
  }

  async validateAtlasStakeAmount(address, amount) {
    const requiredAmount = await this.requiredAmount(address);

    if (!requiredAmount.eq(utils.toBN(amount))) {
      throw new Error(`Address ${address} requires a stake of ${requiredAmount} but ${amount} provided.`);
    }
  }

  async validateApolloDepositAmount(address, amount) {
    const requiredAmount = await this.requiredAmount(address);

    if (requiredAmount.gt(utils.toBN(amount))) {
      throw new Error(`Address ${address} requires a minimum deposit of ${requiredAmount} but ${amount} provided.`);
    }
  }

  async requiredAmount(address) {
    return utils.toBN(await this.kycWhitelistWrapper.getRequiredDeposit(address));
  }

  async retire() {
    const role = await this.rolesWrapper.onboardedRole(this.rolesWrapper.defaultAddress);
    switch (role) {
      case ATLAS:
        if (await this.atlasStakeWrapper.isShelteringAny(this.atlasStakeWrapper.defaultAddress)) {
          throw new Error('Cannot retire while still sheltering bundles');
        }
        return this.rolesWrapper.retireAtlas();
      case APOLLO:
        return this.rolesWrapper.retireApollo();
      case HERMES:
        return this.rolesWrapper.retireHermes();
    }
    throw new Error('The node is not onboarded');
  }
}
