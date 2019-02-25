/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ManagedOwnableContractWrapper from './managed_ownable_contract_wrapper';

export default class KycWhitelistWrapper extends ManagedOwnableContractWrapper {
  get getContractName() {
    return 'kycWhitelist';
  }

  async add(address, role, requiredDeposit) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.add(address, role, requiredDeposit));
  }

  async remove(address) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.remove(address));
  }

  async isWhitelisted(address) {
    const contract = await this.contract();
    return contract.methods.isWhitelisted(address).call();
  }

  async hasRoleAssigned(address, role) {
    const contract = await this.contract();
    return contract.methods.hasRoleAssigned(address, role).call();
  }

  async getRequiredDeposit(address) {
    const contract = await this.contract();
    return contract.methods.getRequiredDeposit(address).call();
  }

  async getRoleAssigned(address) {
    const contract = await this.contract();
    return contract.methods.getRoleAssigned(address).call();
  }
}
