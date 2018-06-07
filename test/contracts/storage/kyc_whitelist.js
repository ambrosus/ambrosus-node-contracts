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
import deployAll from '../../helpers/deployAll';

chai.use(web3jsChai());

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('KYC Whitelist Contract', () => {
  let web3;
  let from;
  let other;
  let stakeStore;
  let bundleRegistry;
  let kycWhitelist;
  let head;


  beforeEach(async () => {
    web3 = await createWeb3();
    [from, other] = await web3.eth.getAccounts();
    ({stakeStore, bundleRegistry, kycWhitelist, head} = await deployContracts(web3));
    await deployAll(web3, head, [from], [bundleRegistry.options.address, stakeStore.options.address, kycWhitelist.options.address]);
  });

  it(`adds removes from whitelist, checks if address is whitelisted`, async () => {
    expect(await kycWhitelist.methods.isWhitelisted(other).call()).to.equal(false);
    await kycWhitelist.methods.add(other).send({from});
    expect(await kycWhitelist.methods.isWhitelisted(other).call()).to.equal(true);
    await kycWhitelist.methods.remove(other).send({from});
    expect(await kycWhitelist.methods.isWhitelisted(other).call()).to.equal(false);
  });

  it(`rejects if non owner attempts to add`, async () => {
    await expect(kycWhitelist.methods.add(other).send({other})).to.be.eventually.rejected;
    expect(await kycWhitelist.methods.isWhitelisted(other).call()).to.equal(false);
  });

  it(`rejects if non owner attempts to remove`, async () => {
    await kycWhitelist.methods.add(other).send({from});
    await expect(kycWhitelist.methods.remove(other).send({other})).to.be.eventually.rejected;
    expect(await kycWhitelist.methods.isWhitelisted(other).call()).to.equal(true);
  });
});
