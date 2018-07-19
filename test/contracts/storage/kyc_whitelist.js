/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3, deployContract} from '../../../src/web3_tools';
import KycWhitelistJson from '../../../build/contracts/KycWhitelist.json';
import {APOLLO, ATLAS, HERMES} from '../../../src/consts';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('KYC Whitelist Contract', () => {
  let web3;
  let from;
  let other;
  let totalStranger;
  let kycWhitelist;

  const isWhitelisted = async (address) => kycWhitelist.methods.isWhitelisted(address).call();
  const hasRoleAssigned = async (address, role) => kycWhitelist.methods.hasRoleAssigned(address, role).call();
  const addToWhitelist = async (address, role, sender = from) => kycWhitelist.methods.add(address, role).send({from: sender});
  const removeFromWhitelist = async (address, sender = from) => kycWhitelist.methods.remove(address).send({from: sender});

  beforeEach(async () => {
    web3 = await createWeb3();
    [from, other, totalStranger] = await web3.eth.getAccounts();
    kycWhitelist = await deployContract(web3, KycWhitelistJson);    
  });

  it(`adds and removes from whitelist, checks if address is whitelisted`, async () => {
    expect(await isWhitelisted(other)).to.equal(false);
    await addToWhitelist(other, APOLLO);
    expect(await isWhitelisted(other)).to.equal(true);
    await removeFromWhitelist(other);
    expect(await isWhitelisted(other)).to.equal(false);
  });

  it('has no role permitted before whitelisting', async () => {
    expect(await hasRoleAssigned(other, ATLAS)).to.be.false;
    expect(await hasRoleAssigned(other, HERMES)).to.be.false;
    expect(await hasRoleAssigned(other, APOLLO)).to.be.false;
  });

  it('assigns and unassigns a role to the address', async () => {
    await addToWhitelist(other, APOLLO);
    expect(await hasRoleAssigned(other, APOLLO)).to.be.true;
    expect(await hasRoleAssigned(other, HERMES)).to.be.false;
    await removeFromWhitelist(other);
    expect(await hasRoleAssigned(other, APOLLO)).to.be.false;
  });

  it('is possible to assign role after it was unassigned', async () => {
    await addToWhitelist(other, APOLLO);
    await removeFromWhitelist(other);
    await addToWhitelist(other, HERMES);
    expect(await hasRoleAssigned(other, APOLLO)).to.be.false;
    expect(await hasRoleAssigned(other, HERMES)).to.be.true;
  });

  it(`throws if non owner attempts to add`, async () => {
    await expect(addToWhitelist(other, totalStranger)).to.be.eventually.rejected;
    expect(await isWhitelisted(other)).to.equal(false);
  });

  it(`throws if non owner attempts to remove`, async () => {
    await addToWhitelist(other, APOLLO);
    await expect(removeFromWhitelist(other, totalStranger)).to.be.eventually.rejected;
    expect(await isWhitelisted(other)).to.be.true;
  });

  it('throws on try to assign nonexisting role', async () => {
    await expect(addToWhitelist(other, 0)).to.be.eventually.rejected;
    await expect(addToWhitelist(other, 420)).to.be.eventually.rejected;
  });

  it('throws if whitelisting the address that is already whitelisted', async () => {
    await addToWhitelist(other, APOLLO);
    await expect(addToWhitelist(other, HERMES)).to.be.eventually.rejected;
  });
});
