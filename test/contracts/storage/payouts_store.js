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

import BN from 'bn.js';

chai.use(web3jsChai());

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('PayoutsStore Contract', () => {
  let web3;
  let validUser;
  let targetUser;
  let otherUser;
  let payoutsStore;

  const grantRepeating = (beneficiary, periodBegin, periodEnd, value, senderAddress = validUser) => payoutsStore.methods.grantRepeating(beneficiary, periodBegin, periodEnd).send({from: senderAddress, value});
  const revokeRepeating = (beneficiary, periodStart, periodEnd, amount, refundAddress, senderAddress = validUser) => payoutsStore.methods.revokeRepeating(beneficiary, periodStart, periodEnd, amount, refundAddress).send({from: senderAddress});
  const available = (beneficiary, period, senderAddress = validUser) => payoutsStore.methods.available(beneficiary, period).call({from: senderAddress});

  const observeBalanceChange = async (account, codeBlock) => {
    const balanceBefore = new BN(await web3.eth.getBalance(account));    
    await codeBlock();
    const balanceAfter = new BN(await web3.eth.getBalance(account));
    return balanceAfter.sub(balanceBefore).toString();
  };

  const expectBalanceChange = async (account, amount, codeBlock) => expect(await observeBalanceChange(account, codeBlock)).to.eq(amount);

  beforeEach(async () => {
    ({web3, payoutsStore} = await deploy({contracts: {payoutsStore: true}}));
    [validUser, targetUser, otherUser] = await web3.eth.getAccounts();
  });

  describe('Deployment', () => {
    it('properly initializes', async () => {

    });
  });

  describe('Granting repeated payouts', () => {
    it('increases founds available for withdrawal', async () => {
      await grantRepeating(targetUser, 10, 12, 30);

      expect(await available(targetUser, 9)).to.eq('0');
      expect(await available(targetUser, 10)).to.eq('10');
      expect(await available(targetUser, 11)).to.eq('10');
      expect(await available(targetUser, 12)).to.eq('10');
      expect(await available(targetUser, 13)).to.eq('0');
    });

    it('can be used multiple times', async () => {
      await grantRepeating(targetUser, 10, 14, 50);
      await grantRepeating(targetUser, 11, 12, 16);

      expect(await available(targetUser, 9)).to.eq('0');
      expect(await available(targetUser, 10)).to.eq('10');
      expect(await available(targetUser, 11)).to.eq('18');
      expect(await available(targetUser, 12)).to.eq('18');
      expect(await available(targetUser, 13)).to.eq('10');
      expect(await available(targetUser, 14)).to.eq('10');
      expect(await available(targetUser, 15)).to.eq('0');
    });

    it('can be used for a single period', async () => {
      await grantRepeating(targetUser, 10, 10, 12);

      expect(await available(targetUser, 9)).to.eq('0');
      expect(await available(targetUser, 10)).to.eq('12');
      expect(await available(targetUser, 11)).to.eq('0');
    });

    it('fails if amount in not evenly divided by period count', async () => {
      await expect(grantRepeating(targetUser, 10, 11, 3)).to.be.eventually.rejected;
    });

    it(`is a contextInternalCall`, async () => {
      await expect(grantRepeating(targetUser, 10, 10, 12, validUser)).to.be.eventually.fulfilled;
      await expect(grantRepeating(targetUser, 10, 10, 12, otherUser)).to.be.eventually.rejected;
    });
  });

  describe('Revoking repeated payouts', () => {
    it('decreases founds available for withdrawal', async () => {
      await grantRepeating(targetUser, 10, 14, 50);
      await revokeRepeating(targetUser, 10, 14, 50, validUser);

      expect(await available(targetUser, 9)).to.eq('0');
      expect(await available(targetUser, 10)).to.eq('0');
      expect(await available(targetUser, 11)).to.eq('0');
      expect(await available(targetUser, 12)).to.eq('0');
      expect(await available(targetUser, 13)).to.eq('0');
      expect(await available(targetUser, 14)).to.eq('0');
      expect(await available(targetUser, 15)).to.eq('0');
    });

    it('is only possible on previously granted periods', async () => {
      await grantRepeating(targetUser, 10, 14, 50);
      await expect(revokeRepeating(targetUser, 10, 12, 30, validUser)).to.eventually.be.rejected;
      await expect(revokeRepeating(targetUser, 10, 14, 50, validUser)).to.eventually.be.fulfilled;
    });

    it('can be used to partially reduce a previously granted period', async () => {
      await grantRepeating(targetUser, 10, 14, 50);
      await revokeRepeating(targetUser, 10, 14, 25, validUser);

      expect(await available(targetUser, 9)).to.eq('0');
      expect(await available(targetUser, 10)).to.eq('5');
      expect(await available(targetUser, 11)).to.eq('5');
      expect(await available(targetUser, 12)).to.eq('5');
      expect(await available(targetUser, 13)).to.eq('5');
      expect(await available(targetUser, 14)).to.eq('5');
      expect(await available(targetUser, 15)).to.eq('0');
    });

    it('can only be used revoke up to the previously granted limit', async () => {
      await grantRepeating(targetUser, 10, 14, 50);
      await expect(revokeRepeating(targetUser, 10, 14, 25, validUser)).to.eventually.be.fulfilled;
      await expect(revokeRepeating(targetUser, 10, 14, 30, validUser)).to.eventually.be.rejected;
      await expect(revokeRepeating(targetUser, 10, 14, 25, validUser)).to.eventually.be.fulfilled;
    });

    it('transfers the refund to provided address', async () => {
      await grantRepeating(targetUser, 10, 14, 50);
      await expectBalanceChange(otherUser, '25', async () => revokeRepeating(targetUser, 10, 14, 25, otherUser));
    });

    it('transfers the refund to provided address and takes withdrawals into account', async () => {
      await grantRepeating(targetUser, 10, 14, 50);
      await grantRepeating(targetUser, 10, 14, 50);
      await expectBalanceChange(otherUser, '25', async () => revokeRepeating(targetUser, 10, 14, 25, otherUser));
    });

    it('fails if amount in not evenly divided by period count', async () => {
      await grantRepeating(targetUser, 10, 11, 12, validUser); // add something first so that a valid call succeeds
      await expect(revokeRepeating(targetUser, 10, 11, 3, targetUser)).to.be.eventually.rejected;
      await expect(revokeRepeating(targetUser, 10, 11, 4, targetUser)).to.be.eventually.fulfilled;
    });

    it(`is a contextInternalCall`, async () => {
      await grantRepeating(targetUser, 10, 10, 12, validUser); // add something first so that a valid call succeeds
      await expect(revokeRepeating(targetUser, 10, 10, 6, targetUser, validUser)).to.be.eventually.fulfilled;
      await expect(revokeRepeating(targetUser, 10, 10, 6, targetUser, otherUser)).to.be.eventually.rejected;
    });
  });

  describe('Withdrawing', () => {
    it(`is a contextInternalCall`, async () => {

    });

    it(`transfers available founds for unused periods to the provided address`, () => {

    });

    it(`doesn't allow to transfer the founds for the same period multiple times`, () => {

    });
  });
});
