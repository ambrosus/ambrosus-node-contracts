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

// import BN from 'bn.js';

chai.use(web3jsChai());

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe.skip('PayoutsStore Contract', () => {
  let web3;
  let validUser;
  let targetUser;
  let invalidUser;
  let payoutsStore;

  const grantRepeating = (beneficiary, periodBegin, periodEnd, value, senderAddress = validUser) => payoutsStore.methods.grantRepeating(beneficiary, periodBegin, periodEnd).send({from: senderAddress, value});
  const revokeRepeating = (beneficiary, periodStart, periodEnd, amount, refundAddress, senderAddress = validUser) => payoutsStore.methods.revokeRepeating(beneficiary, periodStart, periodEnd, amount, refundAddress).send({from: senderAddress});
  const available = (beneficiary, period, senderAddress = validUser) => payoutsStore.methods.available(beneficiary, period).call({from: senderAddress});

  beforeEach(async () => {
    ({web3, payoutsStore} = await deploy({contracts: {payoutsStore: true}}));
    [validUser, targetUser, invalidUser] = await web3.eth.getAccounts();
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

    it('fails if amount in not evenly divided by period length', async () => {

    });

    it(`is a contextInternalCall`, async () => {
      await expect(grantRepeating(targetUser, 10, 10, 12, validUser)).to.be.eventually.fulfilled;
      await expect(grantRepeating(targetUser, 10, 10, 12, invalidUser)).to.be.eventually.rejected;
    });
  });

  describe('Revoking repeated payouts', () => {
    it('decreases founds available for withdrawal', async () => {
      await grantRepeating(targetUser, 10, 14, 50);
      await revokeRepeating(targetUser, 12, 13, 6, validUser);

      expect(await available(targetUser, 9)).to.eq('0');
      expect(await available(targetUser, 10)).to.eq('10');
      expect(await available(targetUser, 11)).to.eq('10');
      expect(await available(targetUser, 12)).to.eq('7');
      expect(await available(targetUser, 13)).to.eq('7');
      expect(await available(targetUser, 14)).to.eq('10');
      expect(await available(targetUser, 15)).to.eq('0');
    });

    it('fails if amount in not evenly divided by period length', async () => {

    });

    it(`is a contextInternalCall`, async () => {
      await grantRepeating(targetUser, 10, 10, 12, validUser); // add something first so that a valid call succeeds
      await expect(revokeRepeating(targetUser, 10, 10, 6, targetUser, validUser)).to.be.eventually.fulfilled;
      await expect(revokeRepeating(targetUser, 10, 10, 6, targetUser, invalidUser)).to.be.eventually.rejected;
    });
  });

  describe('Withdrawing', () => {

  });
});
