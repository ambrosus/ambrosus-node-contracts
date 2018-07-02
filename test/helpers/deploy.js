/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import MockContextJson from '../../build/contracts/MockContext.json';
import Deployer from '../../src/deployer';
import {addToWhitelist} from './whitelist.js';
import {createWeb3, deployContract, getDefaultAddress} from '../../src/web3_tools';

export class MockContextDeployer extends Deployer {
  getWhitelisted() {
    return this.whitelisted || [this.from];
  }

  async setupContext(contracts, whitelistedAddreses = this.getWhitelisted()) {
    const context = await deployContract(this.web3, MockContextJson, contracts, {from: this.from});
    await addToWhitelist(this.web3, context, whitelistedAddreses, this.from);
    await this.head.methods.setContext(context.options.address).send({
      gas: this.gas,
      from: this.from
    });
    return context;
  }
}

const deploy = async (options = {}) => {
  const web3 = options.web3 || await createWeb3();
  const from = options.from || getDefaultAddress(web3);
  const {contracts} = options;
  const deployer = new MockContextDeployer(web3, from);
  return {web3, ...await deployer.deploy(contracts)};
};

export default deploy;
