/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import deploy from '../../helpers/deploy';
import {createWeb3, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import observeBalanceChange from '../../helpers/web3BalanceObserver';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Apollo Deposit Contract', () => {
  let web3;
  let from;
  let other;
  let apolloDepositStore;
  let snapshotId;
  const deposit = '100';

  const depositFunds = (apollo = from, sender = from, value = deposit) => apolloDepositStore.methods.storeDeposit(apollo).send({from: sender, value, gasPrice: '0'});
  const releaseDeposit = (apollo = from, refundAddress = other, sender = from) => apolloDepositStore.methods.releaseDeposit(apollo, refundAddress).send({from: sender, gasPrice: '0'});
  const isDepositing = (apollo = from) => apolloDepositStore.methods.isDepositing(apollo).call();

  before(async () => {
    web3 = await createWeb3();
    [from, other] = await web3.eth.getAccounts();
    ({apolloDepositStore} = await deploy({
      web3,
      contracts: {
        apolloDepositStore: true
      }
    }));
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  it('Deposits the funds', async () => {
    expect(await isDepositing()).to.equal(false);
    const balanceChange = await observeBalanceChange(web3, apolloDepositStore.options.address, depositFunds);
    expect(balanceChange.toString()).to.equal(deposit);
    expect(await isDepositing()).to.equal(true);
  });

  it('storeDeposit is contextInternal', async () => {
    await expect(depositFunds(from, other)).to.be.eventually.rejected;
  });

  it('releaseDeposit returns all funds to apollo address', async () => {
    await depositFunds();
    const balanceChange = await observeBalanceChange(web3, other, releaseDeposit);
    expect(balanceChange.toString()).to.equal(deposit);
    expect(await isDepositing()).to.equal(false);
  });

  it('releaseDeposit is contextInternal', async () => {
    await depositFunds();
    await expect(releaseDeposit(from, other, other)).to.be.eventually.rejected;
  });

  it('can not release deposit if the refund address equals 0x0', async () => {
    await expect(releaseDeposit(from, '0x0000000000000000000000000000000000000000', from)).to.be.eventually.rejected;
  });

  it('is not possible to release empty deposit', async () => {
    await expect(releaseDeposit()).to.be.eventually.rejected;
  });
});
