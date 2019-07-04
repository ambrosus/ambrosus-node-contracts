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
import observeBalanceChange from '../../helpers/web3BalanceObserver';
import {createWeb3, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('PayoutsStore Contract', () => {
  let web3;
  let validUser;
  let beneficiary;
  let withdrawTarget;
  let otherUser;
  let payoutsStore;
  let snapshotId;

  const grantForPeriods = (beneficiary, firstPeriod, lastPeriod, value, from = validUser) => payoutsStore.methods.grantForPeriods(beneficiary, firstPeriod, lastPeriod).send({from, value});
  const revokeForPeriods = (beneficiary, firstPeriod, lastPeriod, totalPayout, refundAddress, from = validUser) => payoutsStore.methods.revokeForPeriods(beneficiary, firstPeriod, lastPeriod, totalPayout, refundAddress).send({from});
  const revokeForPeriodsCall = (beneficiary, firstPeriod, lastPeriod, totalPayout, refundAddress, from = validUser) => payoutsStore.methods.revokeForPeriods(beneficiary, firstPeriod, lastPeriod, totalPayout, refundAddress).call({from});
  const available = (beneficiary, period, from = validUser) => payoutsStore.methods.available(beneficiary, period).call({from});
  const withdraw = (beneficiary, target, toPeriod, from = validUser) => payoutsStore.methods.withdraw(beneficiary, target, toPeriod).send({from});
  const withdrawCall = (beneficiary, target, toPeriod, from = validUser) => payoutsStore.methods.withdraw(beneficiary, target, toPeriod).call({from});

  const expectBalanceChange = async (account, amount, codeBlock) => expect((await observeBalanceChange(web3, account, codeBlock)).toString()).to.eq(amount);

  before(async () => {
    web3 = await createWeb3();
    [validUser, beneficiary, withdrawTarget, otherUser] = await web3.eth.getAccounts();
    ({payoutsStore} = await deploy({
      web3,
      contracts: {
        payoutsStore: true
      }
    }));
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('Granting repeated payouts', () => {
    it('increases funds available for withdrawal', async () => {
      await grantForPeriods(beneficiary, 10, 12, 30);

      expect(await available(beneficiary, 9)).to.eq('0');
      expect(await available(beneficiary, 10)).to.eq('10');
      expect(await available(beneficiary, 11)).to.eq('10');
      expect(await available(beneficiary, 12)).to.eq('10');
      expect(await available(beneficiary, 13)).to.eq('0');
    });

    it('can be used multiple times', async () => {
      await grantForPeriods(beneficiary, 10, 14, 50);
      await grantForPeriods(beneficiary, 11, 12, 16);

      expect(await available(beneficiary, 9)).to.eq('0');
      expect(await available(beneficiary, 10)).to.eq('10');
      expect(await available(beneficiary, 11)).to.eq('18');
      expect(await available(beneficiary, 12)).to.eq('18');
      expect(await available(beneficiary, 13)).to.eq('10');
      expect(await available(beneficiary, 14)).to.eq('10');
      expect(await available(beneficiary, 15)).to.eq('0');
    });

    it('can be used for a single period', async () => {
      await grantForPeriods(beneficiary, 10, 10, 12);

      expect(await available(beneficiary, 9)).to.eq('0');
      expect(await available(beneficiary, 10)).to.eq('12');
      expect(await available(beneficiary, 11)).to.eq('0');
    });

    it('fails if totalPayout in not evenly divided by period count', async () => {
      await expect(grantForPeriods(beneficiary, 10, 11, 3)).to.be.eventually.rejected;
    });

    it(`is a contextInternalCall`, async () => {
      await expect(grantForPeriods(beneficiary, 10, 10, 12, validUser)).to.be.eventually.fulfilled;
      await expect(grantForPeriods(beneficiary, 10, 10, 12, otherUser)).to.be.eventually.rejected;
    });
  });

  describe('Revoking repeated payouts', () => {
    it('decreases funds available for withdrawal', async () => {
      await grantForPeriods(beneficiary, 10, 14, 50);
      await revokeForPeriods(beneficiary, 10, 14, 50, validUser);

      expect(await available(beneficiary, 9)).to.eq('0');
      expect(await available(beneficiary, 10)).to.eq('0');
      expect(await available(beneficiary, 11)).to.eq('0');
      expect(await available(beneficiary, 12)).to.eq('0');
      expect(await available(beneficiary, 13)).to.eq('0');
      expect(await available(beneficiary, 14)).to.eq('0');
      expect(await available(beneficiary, 15)).to.eq('0');
    });

    it('is only possible on previously granted periods', async () => {
      await grantForPeriods(beneficiary, 10, 14, 50);
      await expect(revokeForPeriods(beneficiary, 10, 12, 30, validUser)).to.eventually.be.rejected;
      await expect(revokeForPeriods(beneficiary, 10, 14, 50, validUser)).to.eventually.be.fulfilled;
    });

    it('can be used to partially reduce a previously granted period', async () => {
      await grantForPeriods(beneficiary, 10, 14, 50);
      await revokeForPeriods(beneficiary, 10, 14, 25, validUser);

      expect(await available(beneficiary, 9)).to.eq('0');
      expect(await available(beneficiary, 10)).to.eq('5');
      expect(await available(beneficiary, 11)).to.eq('5');
      expect(await available(beneficiary, 12)).to.eq('5');
      expect(await available(beneficiary, 13)).to.eq('5');
      expect(await available(beneficiary, 14)).to.eq('5');
      expect(await available(beneficiary, 15)).to.eq('0');
    });

    it('can only be used revoke up to the previously granted limit', async () => {
      await grantForPeriods(beneficiary, 10, 14, 50);
      await expect(revokeForPeriods(beneficiary, 10, 14, 25, validUser)).to.eventually.be.fulfilled;
      await expect(revokeForPeriods(beneficiary, 10, 14, 30, validUser)).to.eventually.be.rejected;
      await expect(revokeForPeriods(beneficiary, 10, 14, 25, validUser)).to.eventually.be.fulfilled;
    });

    it('transfers the refund to provided address', async () => {
      await grantForPeriods(beneficiary, 10, 14, 50);
      await expectBalanceChange(otherUser, '25', async () => revokeForPeriods(beneficiary, 10, 14, 25, otherUser));
    });

    it('transfers the refund to provided address and takes withdrawals into account', async () => {
      await grantForPeriods(beneficiary, 10, 14, 50);
      await expectBalanceChange(withdrawTarget, '30', async () => withdraw(beneficiary, withdrawTarget, 12));
      await expectBalanceChange(otherUser, '20', async () => revokeForPeriods(beneficiary, 10, 14, 50, otherUser));
    });

    it('returns the refunded amount', async () => {
      await grantForPeriods(beneficiary, 10, 14, 50);
      expect(await revokeForPeriodsCall(beneficiary, 10, 14, 50, otherUser)).to.equal('50');
    });

    it('returns the refunded amount and takes withdrawals into account', async () => {
      await grantForPeriods(beneficiary, 10, 14, 50);
      await withdraw(beneficiary, withdrawTarget, 12);
      expect(await revokeForPeriodsCall(beneficiary, 10, 14, 50, otherUser)).to.equal('20');
    });

    it('fails if totalPayout in not evenly divided by period count', async () => {
      await grantForPeriods(beneficiary, 10, 11, 12, validUser); // add something first so that a valid call succeeds
      await expect(revokeForPeriods(beneficiary, 10, 11, 3, beneficiary)).to.be.eventually.rejected;
      await expect(revokeForPeriods(beneficiary, 10, 11, 4, beneficiary)).to.be.eventually.fulfilled;
    });

    it(`is a contextInternalCall`, async () => {
      await grantForPeriods(beneficiary, 10, 10, 12, validUser); // add something first so that a valid call succeeds
      await expect(revokeForPeriods(beneficiary, 10, 10, 6, beneficiary, validUser)).to.be.eventually.fulfilled;
      await expect(revokeForPeriods(beneficiary, 10, 10, 6, beneficiary, otherUser)).to.be.eventually.rejected;
    });
  });

  describe('Withdrawing', () => {
    it(`is a contextInternalCall`, async () => {
      await expect(withdraw(beneficiary, withdrawTarget, 10, validUser)).to.be.eventually.fulfilled;
      await expect(withdraw(beneficiary, withdrawTarget, 10, otherUser)).to.be.eventually.rejected;
    });

    it(`transfers available funds for  address`, async () => {
      await grantForPeriods(beneficiary, 10, 14, 50);

      await expectBalanceChange(withdrawTarget, '0', async () => withdraw(beneficiary, withdrawTarget, 9));
      await expectBalanceChange(withdrawTarget, '20', async () => withdraw(beneficiary, withdrawTarget, 11));
      await expectBalanceChange(withdrawTarget, '30', async () => withdraw(beneficiary, withdrawTarget, 14));
    });

    it(`returns proper values`, async () => {
      await grantForPeriods(beneficiary, 10, 14, 50);
      expect(await withdrawCall(beneficiary, withdrawTarget, 9)).to.equal('0');
      expect(await withdrawCall(beneficiary, withdrawTarget, 11)).to.equal('20');
      expect(await withdrawCall(beneficiary, withdrawTarget, 14)).to.equal('50');
    });

    it(`influences return value of available`, async () => {
      await grantForPeriods(beneficiary, 10, 14, 50);
      await withdraw(beneficiary, withdrawTarget, 12);

      expect(await available(beneficiary, 9)).to.eq('0');
      expect(await available(beneficiary, 10)).to.eq('0');
      expect(await available(beneficiary, 11)).to.eq('0');
      expect(await available(beneficiary, 12)).to.eq('0');
      expect(await available(beneficiary, 13)).to.eq('10');
      expect(await available(beneficiary, 14)).to.eq('10');
      expect(await available(beneficiary, 15)).to.eq('0');
    });

    // TODO: we still need to optimise this. For now just check if it fits into a single block.
    it('is performant', async () => {
      await expect(withdraw(beneficiary, withdrawTarget, 1000)).to.be.eventually.fulfilled;
    });

    it(`doesn't allow to transfer the funds for the same period multiple times`, async () => {
      await grantForPeriods(beneficiary, 10, 14, 50);

      await expectBalanceChange(withdrawTarget, '20', async () => withdraw(beneficiary, withdrawTarget, 11));
      await expectBalanceChange(withdrawTarget, '0', async () => withdraw(beneficiary, withdrawTarget, 11));
    });
  });
});
