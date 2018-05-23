/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3} from '../../../src/web3_tools';
import web3jsChai from '../../helpers/events';
import deployContracts from '../../../src/deploy';

chai.use(web3jsChai());

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Context contract', () => {
  let web3;
  let context;
  let bundleRegistry;
  let ownerAddress;

  beforeEach(async () => {
    web3 = await createWeb3();
    ({bundleRegistry, context} = await deployContracts(web3));
    [ownerAddress] = await web3.eth.getAccounts();
  });

  it('canCall returns true only if such address is known', async () => {
    expect(await context.methods.canCall(bundleRegistry.options.address).call()).to.equal(true);
    expect(await context.methods.canCall(ownerAddress).call()).to.equal(false);
  });
});
