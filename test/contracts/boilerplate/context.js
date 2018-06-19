/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import web3jsChai from '../../helpers/events';
import deploy from '../../helpers/deploy';

chai.use(web3jsChai());
chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Context Contract', () => {
  let web3;
  let context;
  let bundleRegistry;
  let accounts;
  
  before(async () => {
    ({web3, bundleRegistry, context} = await deploy({contracts: {bundleRegistry: true}}));
    accounts = await web3.eth.getAccounts();
  });

  it('canCall returns true if address is known', async () => {
    expect(await context.methods.isInternalToContext(bundleRegistry.options.address).call()).to.equal(true);
  });

  it('canCall returns false only if such address is unknown', async () => {
    expect(await context.methods.isInternalToContext(accounts[1]).call()).to.equal(false);
  });
});
