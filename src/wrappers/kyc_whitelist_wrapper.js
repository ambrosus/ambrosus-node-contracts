/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ContractWrapper from './contract_wrapper';

export default class KycWhitelistWrapper extends ContractWrapper {
  get getContractName() {
    return 'kycWhitelist';
  }

  async add(address, role, requiredDeposit) {
    const contract = await this.contract();
    await contract.methods.add(address, role, requiredDeposit).send({from: this.defaultAddress});
  }

  async remove(address) {
    const contract = await this.contract();
    await contract.methods.remove(address).send({from: this.defaultAddress});
  }

  async isWhitelisted(address) {
    const contract = await this.contract();
    return contract.methods.isWhitelisted(address).call();
  }

  async hasRoleAssigned(address, role) {
    const contract = await this.contract();
    return contract.methods.hasRoleAssigned(address, role).call();
  }

  async selfHasRoleAssigned(role) {
    const contract = await this.contract();
    return contract.methods.hasRoleAssigned(this.defaultAddress, role).call();
  }
}
