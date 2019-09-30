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
import TimeMockJson from '../../../src/contracts/TimeMock.json';
import observeBalanceChange from '../../helpers/web3BalanceObserver';
import {createWeb3, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import {PAYOUT_PERIOD_UNIT} from '../../helpers/consts';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Payouts Contract', () => {
  let web3;
  let validUser;
  let beneficiary;
  let withdrawTarget;
  let otherUser;
  let payoutsStore;
  let payouts;
  let time;
  let snapshotId;

  const addShelteringReward = (beneficiary, firstPeriod, lastPeriod, value, from = validUser) => payouts.methods.addShelteringReward(beneficiary, firstPeriod, lastPeriod).send({from, value});
  const grantShelteringReward = (beneficiary, numberOfPeriods, value, from = validUser) => payouts.methods.grantShelteringReward(beneficiary, numberOfPeriods).send({from, value});
  const revokeShelteringReward = (beneficiary, beginTimestamp, numberOfPeriods, value, refundAddress, from = validUser) => payouts.methods.revokeShelteringReward(beneficiary, beginTimestamp, numberOfPeriods, value, refundAddress).send({from});
  const revokeShelteringRewardCall = (beneficiary, beginTimestamp, numberOfPeriods, value, refundAddress, from = validUser) => payouts.methods.revokeShelteringReward(beneficiary, beginTimestamp, numberOfPeriods, value, refundAddress).call({from});
  const available = (period, from = validUser) => payouts.methods.available(period).call({from});
  const withdraw = (beneficiary, from = validUser) => payouts.methods.withdraw(beneficiary).send({from, gasPrice: '0'});

  const injectGrantRepeating = (beneficiary, firstPeriod, lastPeriod, value, from = validUser) => payoutsStore.methods.grantForPeriods(beneficiary, firstPeriod, lastPeriod).send({from, value});
  const setTimestamp = (timestamp, from = validUser) => time.methods.setCurrentTimestamp(timestamp).send({from});
  const getTimestamp = (from = validUser) => time.methods.currentTimestamp().call({from});

  const expectBalanceChange = async (account, amount, codeBlock) => expect((await observeBalanceChange(web3, account, codeBlock)).toString()).to.eq(amount);

  before(async () => {
    web3 = await createWeb3();
    [validUser, beneficiary, withdrawTarget, otherUser] = await web3.eth.getAccounts();
    ({payoutsStore, payouts, time} = await deploy({
      web3,
      contracts: {
        payoutsStore: true,
        payouts: true,
        time: TimeMockJson,
        config: true
      }
    }));
    await setTimestamp(PAYOUT_PERIOD_UNIT * 10.4);
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('Granting a sheltering reward', () => {
    it('increases funds available for withdrawal (unaligned period)', async () => {
      await grantShelteringReward(beneficiary, 3, 100000);

      expect(await available(10, beneficiary)).to.be.equal('0');
      expect(await available(11, beneficiary)).to.be.equal('26000');
      expect(await available(12, beneficiary)).to.be.equal('26000');
      expect(await available(13, beneficiary)).to.be.equal('48000');
      expect(await available(14, beneficiary)).to.be.equal('0');
    });

    it('increases funds available for withdrawal (grant not divisible by period number)', async () => {
      await grantShelteringReward(beneficiary, 7, 100000);

      expect(await available(10, beneficiary)).to.be.equal('0');
      expect(await available(11, beneficiary)).to.be.equal('11142');
      expect(await available(12, beneficiary)).to.be.equal('11142');
      expect(await available(13, beneficiary)).to.be.equal('11142');
      expect(await available(14, beneficiary)).to.be.equal('11142');
      expect(await available(15, beneficiary)).to.be.equal('11142');
      expect(await available(16, beneficiary)).to.be.equal('11142');
      expect(await available(17, beneficiary)).to.be.equal('33148');
      expect(await available(18, beneficiary)).to.be.equal('0');
    });

    it('can be used multiple times', async () => {
      await grantShelteringReward(beneficiary, 3, 100000);
      await setTimestamp(PAYOUT_PERIOD_UNIT * 11);
      await grantShelteringReward(beneficiary, 3, 100000);

      expect(await available(10, beneficiary)).to.be.equal('0'); // 0 + 0
      expect(await available(11, beneficiary)).to.be.equal('26000'); // 26000 + 0
      expect(await available(12, beneficiary)).to.be.equal('52000'); // 26000 + 26000
      expect(await available(13, beneficiary)).to.be.equal('74000'); // 48000 + 26000
      expect(await available(14, beneficiary)).to.be.equal('48000'); // 0 + 48000
      expect(await available(15, beneficiary)).to.be.equal('0'); // 0 + 0
    });

    it(`is a contextInternalCall`, async () => {
      await expect(grantShelteringReward(beneficiary, 12, 12000, validUser)).to.be.eventually.fulfilled;
      await expect(grantShelteringReward(beneficiary, 12, 12000, otherUser)).to.be.eventually.rejected;
    });
  });

  describe('Adding a sheltering reward', () => {
    it('increases funds available for withdrawal (unaligned period)', async () => {
      await addShelteringReward(beneficiary, 11, 13, 100000);

      expect(await available(10, beneficiary)).to.be.equal('0');
      expect(await available(11, beneficiary)).to.be.equal('26000');
      expect(await available(12, beneficiary)).to.be.equal('26000');
      expect(await available(13, beneficiary)).to.be.equal('48000');
      expect(await available(14, beneficiary)).to.be.equal('0');
    });

    it('increases funds available for withdrawal (grant not divisible by period number)', async () => {
      await addShelteringReward(beneficiary, 11, 17, 100000);

      expect(await available(10, beneficiary)).to.be.equal('0');
      expect(await available(11, beneficiary)).to.be.equal('11142');
      expect(await available(12, beneficiary)).to.be.equal('11142');
      expect(await available(13, beneficiary)).to.be.equal('11142');
      expect(await available(14, beneficiary)).to.be.equal('11142');
      expect(await available(15, beneficiary)).to.be.equal('11142');
      expect(await available(16, beneficiary)).to.be.equal('11142');
      expect(await available(17, beneficiary)).to.be.equal('33148');
      expect(await available(18, beneficiary)).to.be.equal('0');
    });

    it('can be used multiple times', async () => {
      await addShelteringReward(beneficiary, 11, 13, 100000);
      await addShelteringReward(beneficiary, 11, 13, 100000);

      expect(await available(10, beneficiary)).to.be.equal('0'); // 0 + 0
      expect(await available(11, beneficiary)).to.be.equal('52000'); // 26000 + 26000
      expect(await available(12, beneficiary)).to.be.equal('52000'); // 26000 + 26000
      expect(await available(13, beneficiary)).to.be.equal('96000'); // 48000 + 48000
      expect(await available(14, beneficiary)).to.be.equal('0'); // 0
    });

    it(`is a not contextInternalCall`, async () => {
      await expect(addShelteringReward(beneficiary, 11, 22, 12000, validUser)).to.be.eventually.fulfilled;
      await expect(addShelteringReward(beneficiary, 11, 22, 12000, otherUser)).to.be.eventually.fulfilled;
    });
  });

  describe('Revoking a sheltering reward', () => {
    it('decreases funds available for withdrawal', async () => {
      await grantShelteringReward(beneficiary, 3, 100000);
      await revokeShelteringReward(beneficiary, await getTimestamp(), 3, 100000, beneficiary);

      expect(await available(10, beneficiary)).to.be.equal('0');
      expect(await available(11, beneficiary)).to.be.equal('0');
      expect(await available(12, beneficiary)).to.be.equal('0');
      expect(await available(13, beneficiary)).to.be.equal('0');
    });

    it('is only possible on previously granted rewards', async () => {
      await grantShelteringReward(beneficiary, 3, 100000);
      await expect(revokeShelteringReward(beneficiary, await getTimestamp() - PAYOUT_PERIOD_UNIT, 3, 100000, beneficiary)).to.be.eventually.rejected;
      await expect(revokeShelteringReward(beneficiary, await getTimestamp(), 3, 120000, beneficiary)).to.be.eventually.rejected;
      await expect(revokeShelteringReward(beneficiary, await getTimestamp(), 4, 100000, beneficiary)).to.be.eventually.rejected;
      await expect(revokeShelteringReward(otherUser, await getTimestamp(), 4, 100000, beneficiary)).to.be.eventually.rejected;
    });

    it('transfers the refund to provided address', async () => {
      await grantShelteringReward(beneficiary, 3, 100000);
      await expectBalanceChange(otherUser, '100000', async () => revokeShelteringReward(beneficiary, await getTimestamp(), 3, 100000, otherUser));
    });

    it('transfers the refund to provided address and takes withdrawals into account', async () => {
      await setTimestamp(PAYOUT_PERIOD_UNIT * 10.4);
      await grantShelteringReward(beneficiary, 3, 100000);

      await setTimestamp(PAYOUT_PERIOD_UNIT * 12.4);
      await expectBalanceChange(withdrawTarget, '26000', async () => withdraw(withdrawTarget, beneficiary));

      await expectBalanceChange(otherUser, '74000', async () => revokeShelteringReward(beneficiary, PAYOUT_PERIOD_UNIT * 10.4, 3, 100000, otherUser));
    });

    it('returns the refunded amount', async () => {
      await grantShelteringReward(beneficiary, 3, 100000);
      expect(await revokeShelteringRewardCall(beneficiary, await getTimestamp(), 3, 100000, otherUser)).to.equal('100000');
    });

    it('returns the refunded amount and takes withdrawals into account', async () => {
      await setTimestamp(PAYOUT_PERIOD_UNIT * 10.4);
      await grantShelteringReward(beneficiary, 3, 100000);

      await setTimestamp(PAYOUT_PERIOD_UNIT * 12.4);
      await withdraw(withdrawTarget, beneficiary);

      expect(await revokeShelteringRewardCall(beneficiary, PAYOUT_PERIOD_UNIT * 10.4, 3, 100000, otherUser)).to.equal('74000');
    });

    it(`is a contextInternalCall`, async () => {
      await grantShelteringReward(beneficiary, 12, 12000, validUser);
      await expect(revokeShelteringReward(beneficiary, await getTimestamp(), 12, 12000, beneficiary, validUser)).to.be.eventually.fulfilled;
      await expect(revokeShelteringReward(beneficiary, await getTimestamp(), 12, 12000, beneficiary, otherUser)).to.be.eventually.rejected;
    });
  });

  describe('Withdrawing', () => {
    it(`transfers available funds for past periods only`, async () => {
      await injectGrantRepeating(beneficiary, 7, 12, 18); // 3 per period
      await injectGrantRepeating(beneficiary, 8, 9, 10); // 5 per period

      await expectBalanceChange(withdrawTarget, '19', async () => withdraw(withdrawTarget, beneficiary)); // from periods: 7, 8, 9 => 3, 3 + 5, 3 + 5
      await setTimestamp(PAYOUT_PERIOD_UNIT * 11.2);
      await expectBalanceChange(withdrawTarget, '3', async () => withdraw(withdrawTarget, beneficiary)); // from periods: 10 => 3
    });

    it(`is observable by available`, async () => {
      await injectGrantRepeating(beneficiary, 9, 10, 10);

      expect(await available(9, beneficiary)).to.equal('5');
      expect(await available(10, beneficiary)).to.equal('5');

      await expectBalanceChange(withdrawTarget, '5', async () => withdraw(withdrawTarget, beneficiary));

      expect(await available(9, beneficiary)).to.equal('0');
      expect(await available(10, beneficiary)).to.equal('5');
    });

    it(`doesn't allow to transfer the funds for the same period multiple times`, async () => {
      await injectGrantRepeating(beneficiary, 7, 12, 18);

      await expectBalanceChange(withdrawTarget, '9', async () => withdraw(withdrawTarget, beneficiary));
      await expectBalanceChange(withdrawTarget, '0', async () => withdraw(withdrawTarget, beneficiary));
    });
  });

  describe('Available', () => {
    it('proxies to the payout store using the msg.sender', async () => {
      await injectGrantRepeating(beneficiary, 10, 14, 50);

      expect(await available(11, beneficiary)).to.equal('10');
      expect(await available(11, validUser)).to.equal('0');
    });
  });
});
