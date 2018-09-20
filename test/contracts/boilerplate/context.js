/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import deploy from '../../helpers/deploy';
import {deployContract} from '../../../src/utils/web3_tools';
import ContextJson from '../../../build/contracts/Context';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Context Contract', () => {
  let web3;
  let context;
  let context2;
  let fees;
  let accounts;

  before(async () => {
    ({web3, fees, context} = await deploy({contracts: {fees: true}}));
    context2 = await deployContract(web3, ContextJson);
    accounts = await web3.eth.getAccounts();
  });

  it('initialize1 cannot be called twice', async () => {
    await expect(context2.methods.initialize1(accounts[1], accounts[2], accounts[3], accounts[4]).send({from: accounts[0]})).to.be.fulfilled;
    await expect(context2.methods.initialize1(accounts[1], accounts[2], accounts[3], accounts[4]).send({from: accounts[0]})).to.be.rejected;
  });

  it('initialize2 cannot be called twice', async () => {
    await expect(context2.methods.initialize2(accounts[1], accounts[2], accounts[3], accounts[4], accounts[3], accounts[4]).send({from: accounts[0]})).to.be.fulfilled;
    await expect(context2.methods.initialize2(accounts[1], accounts[2], accounts[3], accounts[4], accounts[3], accounts[4]).send({from: accounts[0]})).to.be.rejected;
  });

  it('initialize3 cannot be called twice', async () => {
    await expect(context2.methods.initialize3(accounts[1], accounts[2], accounts[3], accounts[4], accounts[3], accounts[4]).send({from: accounts[0]})).to.be.fulfilled;
    await expect(context2.methods.initialize3(accounts[1], accounts[2], accounts[3], accounts[4], accounts[3], accounts[4]).send({from: accounts[0]})).to.be.rejected;
  });

  it('isInternalToContext returns true if address is known', async () => {
    expect(await context.methods.isInternalToContext(fees.options.address).call()).to.equal(true);
  });

  it('isInternalToContext returns false only if such address is unknown', async () => {
    expect(await context.methods.isInternalToContext(accounts[1]).call()).to.equal(false);
  });
});
