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
import TimeMockJson from '../../../build/contracts/TimeMock.json';
import observeBalanceChange from '../../helpers/web3BalanceObserver';
import {PAYOUT_PERIOD_IN_SECONDS} from '../../../src/consts';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Payouts Contract', () => {
  let web3;
  let validUser;
  let targetUser;
  let otherUser;
  let payoutsStore;
  let payouts;
  let time;

  const grantShelteringReward = (beneficiary, numberOfPeriods, value, from = validUser) => payouts.methods.grantShelteringReward(beneficiary, numberOfPeriods).send({from, value});
  const revokeShelteringReward = (beneficiary, beginTimestamp, numberOfPeriods, value, refundAddress, from = validUser) => payouts.methods.revokeShelteringReward(beneficiary, beginTimestamp, numberOfPeriods, value, refundAddress).send({from});
  const available = (period, from = validUser) => payouts.methods.available(period).call({from});
  const withdraw = (from = validUser) => payouts.methods.withdraw().send({from, gasPrice: '0'});

  const injectGrantRepeating = (beneficiary, firstPeriod, lastPeriod, value, from = validUser) => payoutsStore.methods.grantForPeriods(beneficiary, firstPeriod, lastPeriod).send({from, value});
  const setTimestamp = (timestamp, from = validUser) => time.methods.setCurrentTimestamp(timestamp).send({from});
  const getTimestamp = (from = validUser) => time.methods.currentTimestamp().call({from});
  
  const expectBalanceChange = async (account, amount, codeBlock) => expect((await observeBalanceChange(web3, account, codeBlock)).toString()).to.eq(amount);

  beforeEach(async () => {
    ({web3, payoutsStore, payouts, time} = await deploy({
      contracts: {
        payoutsStore: true,
        payouts: true,
        time: TimeMockJson,
        config: true
      }
    }));
    [validUser, targetUser, otherUser] = await web3.eth.getAccounts();
    await setTimestamp(PAYOUT_PERIOD_IN_SECONDS * 10.4);
  });

  describe('Granting a sheltering reward', () => {
    it('increases funds available for withdrawal (unaligned period)', async () => { 
      await grantShelteringReward(targetUser, 3, 100000);

      expect(await available(10, targetUser)).to.be.equal('16000');
      expect(await available(11, targetUser)).to.be.equal('26666');
      expect(await available(12, targetUser)).to.be.equal('26666');
      expect(await available(13, targetUser)).to.be.equal('30668');
    });

    it('increases funds available for withdrawal (aligned period)', async () => {
      await setTimestamp(PAYOUT_PERIOD_IN_SECONDS * 10);
      await grantShelteringReward(targetUser, 3, 100000);

      expect(await available(10, targetUser)).to.be.equal('26668');
      expect(await available(11, targetUser)).to.be.equal('26666');
      expect(await available(12, targetUser)).to.be.equal('46666');
    });

    it('can be used multiple times', async () => {
      await grantShelteringReward(targetUser, 3, 100000);
      await setTimestamp(PAYOUT_PERIOD_IN_SECONDS * 11);
      await grantShelteringReward(targetUser, 3, 100000);

      expect(await available(10, targetUser)).to.be.equal('16000'); // 16000
      expect(await available(11, targetUser)).to.be.equal('53334'); // 26666 + 26668
      expect(await available(12, targetUser)).to.be.equal('53332'); // 26666 + 26666
      expect(await available(13, targetUser)).to.be.equal('77334'); // 30668 + 46666
    });

    it(`is a contextInternalCall`, async () => {
      await expect(grantShelteringReward(targetUser, 12, 12000, validUser)).to.be.eventually.fulfilled;
      await expect(grantShelteringReward(targetUser, 12, 12000, otherUser)).to.be.eventually.rejected;
    });
  });

  describe('Revoking a sheltering reward', () => {
    it('decreases funds available for withdrawal', async () => {
      await grantShelteringReward(targetUser, 3, 100000);
      await revokeShelteringReward(targetUser, await getTimestamp(), 3, 100000, targetUser);

      expect(await available(10, targetUser)).to.be.equal('0');
      expect(await available(11, targetUser)).to.be.equal('0');
      expect(await available(12, targetUser)).to.be.equal('0');
      expect(await available(13, targetUser)).to.be.equal('0');
    });

    it('is only possible on previously granted rewards', async () => {
      await grantShelteringReward(targetUser, 3, 100000);
      await expect(revokeShelteringReward(targetUser, await getTimestamp() - PAYOUT_PERIOD_IN_SECONDS, 3, 100000, targetUser)).to.be.eventually.rejected;
      await expect(revokeShelteringReward(targetUser, await getTimestamp(), 3, 120000, targetUser)).to.be.eventually.rejected;
      await expect(revokeShelteringReward(targetUser, await getTimestamp(), 4, 100000, targetUser)).to.be.eventually.rejected;
      await expect(revokeShelteringReward(otherUser, await getTimestamp(), 4, 100000, targetUser)).to.be.eventually.rejected;
    });

    it('transfers the refund to provided address', async () => {
      await grantShelteringReward(targetUser, 3, 100000);
      await expectBalanceChange(otherUser, '100000', async () => revokeShelteringReward(targetUser, await getTimestamp(), 3, 100000, otherUser));
    });

    it('transfers the refund to provided address and takes withdrawals into account', async () => {
      await setTimestamp(PAYOUT_PERIOD_IN_SECONDS * 10.4);
      await grantShelteringReward(targetUser, 3, 100000);

      await setTimestamp(PAYOUT_PERIOD_IN_SECONDS * 11.4);
      await expectBalanceChange(targetUser, '16000', async () => withdraw(targetUser));

      await expectBalanceChange(otherUser, '84000', async () => revokeShelteringReward(targetUser, PAYOUT_PERIOD_IN_SECONDS * 10.4, 3, 100000, otherUser));
    });

    it(`is a contextInternalCall`, async () => {
      await grantShelteringReward(targetUser, 12, 12000, validUser);
      await expect(revokeShelteringReward(targetUser, await getTimestamp(), 12, 12000, targetUser, validUser)).to.be.eventually.fulfilled;
      await expect(revokeShelteringReward(targetUser, await getTimestamp(), 12, 12000, targetUser, otherUser)).to.be.eventually.rejected;
    });
  });

  xdescribe('Transfer sheltering reward', () => {

  });

  describe('Withdrawing', () => {
    it(`transfers available funds for past periods only`, async () => {
      await injectGrantRepeating(targetUser, 7, 12, 18); // 3 per period
      await injectGrantRepeating(targetUser, 8, 9, 10); // 5 per period

      await expectBalanceChange(targetUser, '19', async () => withdraw(targetUser)); // from periods: 7, 8, 9 => 3, 3 + 5, 3 + 5
      await setTimestamp(PAYOUT_PERIOD_IN_SECONDS * 11.2);
      await expectBalanceChange(targetUser, '3', async () => withdraw(targetUser)); // from periods: 10 => 3
    });

    it(`is observable by available`, async () => {
      await injectGrantRepeating(targetUser, 9, 10, 10);

      expect(await available(9, targetUser)).to.equal('5');
      expect(await available(10, targetUser)).to.equal('5');

      await expectBalanceChange(targetUser, '5', async () => withdraw(targetUser));

      expect(await available(9, targetUser)).to.equal('0');
      expect(await available(10, targetUser)).to.equal('5');
    });

    it(`doesn't allow to transfer the funds for the same period multiple times`, async () => {
      await injectGrantRepeating(targetUser, 7, 12, 18);

      await expectBalanceChange(targetUser, '9', async () => withdraw(targetUser));
      await expectBalanceChange(targetUser, '0', async () => withdraw(targetUser));
    });
  });

  describe('Available', () => {
    it('proxies to the payout store using the msg.sender', async () => {
      await injectGrantRepeating(targetUser, 10, 14, 50);

      expect(await available(11, targetUser)).to.equal('10');
      expect(await available(11, validUser)).to.equal('0');
    });
  });
});
