/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import deploy from '../../helpers/deploy';
import {APOLLO, ATLAS, HERMES, APOLLO_DEPOSIT, ATLAS1_STAKE, ATLAS2_STAKE, ATLAS3_STAKE} from '../../../src/consts';
import {ONE} from '../../helpers/consts';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('KYC Whitelist Contract', () => {
  let web3;
  let from;
  let other;
  let totalStranger;
  let kycWhitelist;
  let snapshotId;

  const isWhitelisted = async (address) => kycWhitelist.methods.isWhitelisted(address).call();
  const hasRoleAssigned = async (address, role) => kycWhitelist.methods.hasRoleAssigned(address, role).call();
  const getRequiredDeposit = async (address) => kycWhitelist.methods.getRequiredDeposit(address).call();
  const addToWhitelist = async (address, role, deposit, sender = from) => kycWhitelist.methods.add(address, role, deposit).send({from: sender});
  const removeFromWhitelist = async (address, sender = from) => kycWhitelist.methods.remove(address).send({from: sender});
  const getRoleAssigned = async (address) => kycWhitelist.methods.getRoleAssigned(address).call();

  before(async () => {
    web3 = await createWeb3();
    [from, other, totalStranger] = await web3.eth.getAccounts();
    ({kycWhitelist} = await deploy({
      web3,
      contracts: {
        kycWhitelistStore: true,
        kycWhitelist: true,
        config: true
      }
    }));
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  it(`adds and removes from whitelist, checks if address is whitelisted`, async () => {
    expect(await isWhitelisted(other)).to.equal(false);
    await addToWhitelist(other, APOLLO, APOLLO_DEPOSIT);
    expect(await isWhitelisted(other)).to.equal(true);
    await removeFromWhitelist(other);
    expect(await isWhitelisted(other)).to.equal(false);
  });

  it('works for ATLAS1_STAKE', async () => {
    await expect(addToWhitelist(other, ATLAS, ATLAS1_STAKE)).to.be.fulfilled;
  });

  it('works for ATLAS2_STAKE', async () => {
    await expect(addToWhitelist(other, ATLAS, ATLAS2_STAKE)).to.be.fulfilled;
  });

  it('works for ATLAS3_STAKE', async () => {
    await expect(addToWhitelist(other, ATLAS, ATLAS3_STAKE)).to.be.fulfilled;
  });

  it('has no role permitted before whitelisting', async () => {
    expect(await getRoleAssigned(other)).to.equal('0');
    expect(await hasRoleAssigned(other, ATLAS)).to.be.false;
    expect(await hasRoleAssigned(other, HERMES)).to.be.false;
    expect(await hasRoleAssigned(other, APOLLO)).to.be.false;
  });

  it('assigns and unassigns a role to the address', async () => {
    await addToWhitelist(other, APOLLO, APOLLO_DEPOSIT);
    expect(await getRoleAssigned(other)).to.equal('3');
    expect(await hasRoleAssigned(other, APOLLO)).to.be.true;
    expect(await hasRoleAssigned(other, HERMES)).to.be.false;
    await removeFromWhitelist(other);
    expect(await hasRoleAssigned(other, APOLLO)).to.be.false;
  });

  it('correctly stores required deposit', async () => {
    await addToWhitelist(other, APOLLO, APOLLO_DEPOSIT);
    expect(await getRequiredDeposit(other)).to.equal(APOLLO_DEPOSIT.toString());
  });

  it('is possible to assign role after it was unassigned', async () => {
    await addToWhitelist(other, APOLLO, APOLLO_DEPOSIT);
    await removeFromWhitelist(other);
    await addToWhitelist(other, HERMES, 0);
    expect(await hasRoleAssigned(other, APOLLO)).to.be.false;
    expect(await hasRoleAssigned(other, HERMES)).to.be.true;
  });

  it(`throws if non owner attempts to add`, async () => {
    await expect(addToWhitelist(other, totalStranger, APOLLO_DEPOSIT)).to.be.eventually.rejected;
    expect(await isWhitelisted(other)).to.equal(false);
  });

  it(`throws if non owner attempts to remove`, async () => {
    await addToWhitelist(other, APOLLO, APOLLO_DEPOSIT);
    await expect(removeFromWhitelist(other, totalStranger)).to.be.eventually.rejected;
    expect(await isWhitelisted(other)).to.be.true;
  });

  it('throws on try to assign nonexisting role', async () => {
    await expect(addToWhitelist(other, 0, APOLLO_DEPOSIT)).to.be.eventually.rejected;
    await expect(addToWhitelist(other, 420, APOLLO_DEPOSIT)).to.be.eventually.rejected;
  });

  it('throws if trying to whitelist Apollo with 0 deposit', async () => {
    await expect(addToWhitelist(other, APOLLO, 0)).to.be.eventually.rejected;
  });

  it('throws if trying to whitelist Atlas with a stake not included in config', async () => {
    await expect(addToWhitelist(other, ATLAS, ATLAS1_STAKE.sub(ONE))).to.be.eventually.rejected;
    await expect(addToWhitelist(other, ATLAS, ATLAS1_STAKE.add(ONE))).to.be.eventually.rejected;
    await expect(addToWhitelist(other, ATLAS, ATLAS2_STAKE.sub(ONE))).to.be.eventually.rejected;
    await expect(addToWhitelist(other, ATLAS, ATLAS2_STAKE.add(ONE))).to.be.eventually.rejected;
    await expect(addToWhitelist(other, ATLAS, ATLAS3_STAKE.sub(ONE))).to.be.eventually.rejected;
    await expect(addToWhitelist(other, ATLAS, ATLAS3_STAKE.add(ONE))).to.be.eventually.rejected;
  });

  it('throws if whitelisting the address that is already whitelisted', async () => {
    await addToWhitelist(other, APOLLO, APOLLO_DEPOSIT);
    await expect(addToWhitelist(other, HERMES, 0)).to.be.eventually.rejected;
  });
});
