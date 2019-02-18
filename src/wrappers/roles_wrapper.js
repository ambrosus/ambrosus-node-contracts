/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ManagedContractWrapper from './managed_contract_wrapper';

export default class RolesWrapper extends ManagedContractWrapper {
  get getContractName() {
    return 'roles';
  }

  async onboardedRole(address) {
    const contract = await this.contract();
    return contract.methods.getOnboardedRole(address).call();
  }

  async nodeUrl(address) {
    const contract = await this.contract();
    return contract.methods.getUrl(address).call();
  }

  async setNodeUrl(address, url) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.setUrl(url), {
      from: address
    });
  }

  async onboardAsApollo(address, deposit) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.onboardAsApollo(), {
      from: address,
      value: deposit
    });
  }

  async onboardAsAtlas(address, stake, url) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.onboardAsAtlas(url), {
      from: address,
      value: stake
    });
  }

  async onboardAsHermes(address, url) {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.onboardAsHermes(url), {
      from: address
    });
  }

  async retireAtlas() {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.retireAtlas());
  }

  async retireApollo() {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.retireApollo());
  }

  async retireHermes() {
    const contract = await this.contract();
    return this.processTransaction(contract.methods.retireHermes());
  }
}
