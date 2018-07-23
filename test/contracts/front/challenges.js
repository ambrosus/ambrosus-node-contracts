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
import chaiEmitEvents from '../../helpers/chaiEmitEvents';
import BN from 'bn.js';
import {
  ATLAS,
  ATLAS1_STAKE,
  ATLAS1_STORAGE_LIMIT,
  DAY,
  STORAGE_PERIOD_UNIT,
  SYSTEM_CHALLENGES_COUNT
} from '../../../src/consts';
import {ONE} from '../../helpers/consts';
import deploy from '../../helpers/deploy';
import utils from '../../helpers/utils';
import StakeStoreMockJson from '../../../build/contracts/StakeStoreMock.json';
import TimeMockJson from '../../../build/contracts/TimeMock.json';

chai.use(chaiEmitEvents);

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Challenges Contract', () => {
  let web3;
  let challenges;
  let bundleStore;
  let sheltering;
  let fees;
  let stakes;
  let stakeStore;
  let kycWhitelist;
  let from;
  let other;
  let resolver;
  let totalStranger;
  let fee;
  let time;
  let payouts;
  let payoutsStore;
  let challengeId;
  const bundleId = utils.keccak256('someBundleId');
  let expirationDate;
  const now = 1500000000;
  const shelteringReward = 130000;
  const storagePeriods = 1;

  const setTimestamp = async (timestamp) => time.methods.setCurrentTimestamp(timestamp).send({from});

  beforeEach(async () => {
    web3 = await createWeb3();
    [from, other, resolver, totalStranger] = await web3.eth.getAccounts();
    ({challenges, bundleStore, fees, sheltering, stakes, kycWhitelist, stakeStore, time, payouts, payoutsStore} = await deploy({
      web3,
      contracts: {
        challenges: true,
        bundleStore: true,
        fees: true,
        sheltering: true,
        stakes: true,
        stakeStore: StakeStoreMockJson,
        time: TimeMockJson,
        roles: true,
        kycWhitelist: true,
        config: true,
        payouts: true,
        payoutsStore: true
      }}));
    const storageTimestamp = now;
    expirationDate = storageTimestamp + (storagePeriods * STORAGE_PERIOD_UNIT);
    await setTimestamp(now);
    await bundleStore.methods.store(bundleId, from, storagePeriods).send({from});
    fee = new BN(await fees.methods.getFeeForChallenge(storagePeriods).call());
    challengeId = await challenges.methods.getChallengeId(from, bundleId).call();
  });

  describe('Starting system challenges', () => {
    const otherBundleId = utils.keccak256('otherBundleId');
    let systemFee;

    beforeEach(async () => {
      await bundleStore.methods.store(otherBundleId, other, expirationDate).send({from});
      systemFee = fee.mul(new BN(SYSTEM_CHALLENGES_COUNT));
    });

    it('Is context internal', async () => {
      await expect(challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee})).to.be.eventually.fulfilled;
      await expect(challenges.methods.startForSystem(other, otherBundleId,SYSTEM_CHALLENGES_COUNT).send({from: other, value: systemFee})).to.be.eventually.rejected;
    });

    it('Should emit event', async () => {
      expect(await challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee})).to.emitEvent('ChallengeCreated').withArgs({
        sheltererId: from, bundleId, challengeId, count: SYSTEM_CHALLENGES_COUNT.toString()
      });
    });

    it('Stores challengerId as 0x0', async () => {
      await challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee});
      expect(await challenges.methods.getChallengeCreationTime(challengeId).call()).to.not.equal('0');
      expect(await challenges.methods.getChallenger(challengeId).call()).to.equal('0x0000000000000000000000000000000000000000');
    });

    it('Fails if bundle is not being sheltered by provided account', async () => {
      await expect(challenges.methods.startForSystem(other, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee})).to.be.eventually.rejected;
    });

    it(`Fails if challenger has provided too small fee`, async () => {
      const tooSmallFee = systemFee.sub(ONE);
      await expect(challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: tooSmallFee})).to.be.eventually.rejected;
    });

    it(`Fails if challenger has provided fee that is too high`, async () => {
      const tooBigFee = systemFee.add(ONE);
      await expect(challenges.methods.startForSystem(from, bundleId, 5).send({from, value: tooBigFee})).to.be.eventually.rejected;
    });

    it('Fails if the challenge was added after bundle has expired', async () => {
      const expirationTime = await bundleStore.methods.getShelteringExpirationDate(bundleId, from).call();
      await setTimestamp(expirationTime + 1);
      await expect(challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee})).to.be.eventually.rejected;
    });

    it('Fails if added same challenge twice', async () => {
      expect(await challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee})).to.emitEvent('ChallengeCreated');
      await expect(challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee})).to.be.eventually.rejected;
    });

    describe('Stores system challenges correctly', () => {
      const nullAddress = '0x0000000000000000000000000000000000000000';
      let challengeBlockTimestamp;
      let challengeCreationEvent;
      let challengeId;

      beforeEach(async () => {
        await challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee});
        challengeBlockTimestamp = now;
        [challengeCreationEvent] = await challenges.getPastEvents('allEvents');
        ({challengeId} = challengeCreationEvent.returnValues);
      });

      it('Stores challenge id', async () => {
        expect(await challenges.methods.getChallengeId(from, bundleId).call()).to.equal(challengeId);
      });

      it('Shelterer id', async () => {
        expect(await challenges.methods.getChallengedShelterer(challengeId).call()).to.equal(from);
      });

      it('Bundle id', async () => {
        expect(await challenges.methods.getChallengedBundle(challengeId).call()).to.equal(bundleId);
      });

      it('Challenger id', async () => {
        expect(await challenges.methods.getChallenger(challengeId).call()).to.equal(nullAddress);
      });

      it('Challenge fee', async () => {
        expect(await challenges.methods.getChallengeFee(challengeId).call()).to.equal(systemFee.div(new BN(SYSTEM_CHALLENGES_COUNT)).toString());
      });

      it('Challenge setup time', async () => {
        expect(await challenges.methods.getChallengeCreationTime(challengeId).call()).to.equal(challengeBlockTimestamp.toString());
      });

      it('Challenge active count', async () => {
        expect(await challenges.methods.getActiveChallengesCount(challengeId).call()).to.equal(SYSTEM_CHALLENGES_COUNT.toString());
      });

      it('Challenge in progress', async () => {
        const challengeId = await challenges.methods.getChallengeId(from, bundleId).call();
        expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(true);
      });
    });
  });

  describe('Starting user challenge', () => {
    it('Challenge is not in progress until started', async () => {
      expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(false);
    });

    it('Creates a challenge and emits an event', async () => {
      expect(await challenges.methods.start(from, bundleId).send({from: other, value: fee})).to.emitEvent('ChallengeCreated').withArgs({
        sheltererId: from, bundleId, challengeId, count: '1'
      });
    });

    it('Fails if bundle is not being sheltered by provided account', async () => {
      await expect(challenges.methods.start(other, bundleId).send({from, value: fee})).to.be.eventually.rejected;
      expect(await challenges.methods.start(from, bundleId).send({from: other, value: fee})).to.emitEvent('ChallengeCreated');
    });

    it(`Fails if challenger has provided too low value`, async () => {
      const tooSmallFee = fee.sub(ONE);
      await expect(challenges.methods.start(from, bundleId).send({from: other, value: tooSmallFee})).to.be.eventually.rejected;
    });

    it(`Fails if challenger has provided too high value`, async () => {
      const tooBigFee = fee.add(ONE);
      await expect(challenges.methods.start(from, bundleId).send({from: other, value: tooBigFee})).to.be.eventually.rejected;
    });

    it('Fails if the challenge was added after bundle has expired', async () => {
      const expirationTime = await bundleStore.methods.getShelteringExpirationDate(bundleId, from).call();
      await setTimestamp(expirationTime + 1);
      await expect(challenges.methods.start(from, bundleId).send({from: other, value: fee})).to.be.eventually.rejected;
    });

    it('Fails if added same challenge twice', async () => {
      expect(await challenges.methods.start(from, bundleId).send({from: other, value: fee})).to.emitEvent('ChallengeCreated');
      await expect(challenges.methods.start(from, bundleId).send({from: other, value: fee})).to.be.eventually.rejected;
    });

    describe('Stores challenge correctly', () => {
      let challengeBlockTimestamp;
      let challengeCreationEvent;
      let challengeId;

      beforeEach(async () => {
        await challenges.methods.start(from, bundleId).send({from: other, value: fee});
        challengeBlockTimestamp = now;
        [challengeCreationEvent] = await challenges.getPastEvents('allEvents');
        ({challengeId} = challengeCreationEvent.returnValues);
      });

      it('Stores challenge id', async () => {
        expect(await challenges.methods.getChallengeId(from, bundleId).call()).to.equal(challengeId);
      });

      it('Shelterer id', async () => {
        expect(await challenges.methods.getChallengedShelterer(challengeId).call()).to.equal(from);
      });

      it('Bundle id', async () => {
        expect(await challenges.methods.getChallengedBundle(challengeId).call()).to.equal(bundleId);
      });

      it('Challenger id', async () => {
        expect(await challenges.methods.getChallenger(challengeId).call()).to.equal(other);
      });

      it('Challenge fee', async () => {
        expect(await challenges.methods.getChallengeFee(challengeId).call()).to.equal(fee.toString());
      });

      it('Challenge setup time', async () => {
        expect(await challenges.methods.getChallengeCreationTime(challengeId).call()).to.equal(challengeBlockTimestamp.toString());
      });

      it('Challenge active count', async () => {
        expect(await challenges.methods.getActiveChallengesCount(challengeId).call()).to.equal('1');
      });

      it('Challenge in progress', async () => {
        const challengeId = await challenges.methods.getChallengeId(from, bundleId).call();
        expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(true);
      });
    });
  });

  describe('Resolving a challenge', () => {
    let challengeId;

    beforeEach(async () => {
      await kycWhitelist.methods.add(resolver, ATLAS).send({from});
      await stakes.methods.depositStake(ATLAS).send({from: resolver, value: ATLAS1_STAKE, gasPrice: 0});   
    });

    describe('Resolves correctly', async () => {
      beforeEach(async () => {
        await challenges.methods.start(from, bundleId).send({from: other, value: fee});
        const [challengeCreationEvent] = await challenges.getPastEvents('allEvents');
        ({challengeId} = challengeCreationEvent.returnValues);
      });

      it('Stores resolver as a new shelterer', async () => {
        await challenges.methods.resolve(challengeId).send({from: resolver});
        expect(await sheltering.methods.isSheltering(resolver, bundleId).call()).to.equal(true);
      });

      it('Grants sheltering reward', async () => {
        await challenges.methods.resolve(challengeId).send({from: resolver});
        const currentPayoutPeriod = parseInt(await time.methods.currentPayoutPeriod().call(), 10);
        expect(await payoutsStore.methods.available(resolver, currentPayoutPeriod + 5).call({from})).not.to.equal('0');
      });

      it('Emits an event', async () => {
        expect(await challenges.methods.resolve(challengeId).send({from: resolver, gasPrice: '0'}))
          .to.emitEvent('ChallengeResolved')
          .withArgs({
            sheltererId: from, bundleId, challengeId, resolverId: resolver
          });
      });

      it('Removes challenge if active count was 1', async () => {
        await challenges.methods.resolve(challengeId).send({from: resolver});
        expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(false);
      });
    });

    it('Fails if challenge does not exist', async () => {
      const fakeChallengeId = utils.keccak256('fakeChallengeId');
      await expect(challenges.methods.resolve(fakeChallengeId).send({from: resolver})).to.be.eventually.rejected;
    });

    it('Fails if resolver is already sheltering challenged bundle', async () => {
      await challenges.methods.start(from, bundleId).send({from: other, value: fee});
      const [challengeCreationEvent] = await challenges.getPastEvents('allEvents');
      ({challengeId} = challengeCreationEvent.returnValues);
      await bundleStore.methods.addShelterer(bundleId, resolver, shelteringReward).send({from});
      await expect(challenges.methods.resolve(challengeId).send({from: resolver})).to.be.eventually.rejected;
    });

    it(`Fails if resolver can't store more bundles`, async () => {
      await challenges.methods.start(from, bundleId).send({from: other, value: fee});
      const [challengeCreationEvent] = await challenges.getPastEvents('allEvents');
      ({challengeId} = challengeCreationEvent.returnValues);
      const allStorageUsed = ATLAS1_STORAGE_LIMIT;
      await stakeStore.methods.setStorageUsed(resolver, allStorageUsed).send({from});
      await expect(challenges.methods.resolve(challengeId).send({from: resolver})).to.be.eventually.rejected;
    });

    it('Decreases active count', async () => {
      const systemFee = fee.mul(new BN('3'));
      await challenges.methods.startForSystem(from, bundleId, 3).send({from, value: systemFee});
      const [challengeCreationEvent] = await challenges.getPastEvents('allEvents');
      ({challengeId} = challengeCreationEvent.returnValues);
      await challenges.methods.resolve(challengeId).send({from: resolver});
      expect(await challenges.methods.getActiveChallengesCount(challengeId).call()).to.equal('2');
    });

    it('Removes system challenge if active count was 1', async () => {
      await challenges.methods.startForSystem(from, bundleId, 1).send({from, value: fee});
      const [challengeCreationEvent] = await challenges.getPastEvents('allEvents');
      ({challengeId} = challengeCreationEvent.returnValues);
      await challenges.methods.resolve(challengeId).send({from: resolver});
      expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(false);
    });
  });

  describe('Marking challenge as expired', () => {
    const challengeTimeout = 3 * DAY;
    let challengeId;
    let deposit;
  
    beforeEach(async () => {
      deposit = ATLAS1_STAKE;
      await challenges.methods.start(from, bundleId).send({from: other, value: fee});
      const [challengeCreationEvent] = await challenges.getPastEvents('allEvents');
      ({challengeId} = challengeCreationEvent.returnValues);
      await stakeStore.methods.depositStake(from, ATLAS1_STORAGE_LIMIT, ATLAS).send({from, value: deposit});
      await stakeStore.methods.setStorageUsed(from, 1).send({from});
    });
  
    it(`Fails if challenge does not exist`, async () => {
      const fakeChallengeId = utils.keccak256('fakeChallengeId');
      await expect(challenges.methods.markAsExpired(fakeChallengeId).send({from: other})).to.be.eventually.rejected;
    });

    it(`Fails if challenge has already been marked as expired`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      await expect(challenges.methods.markAsExpired(challengeId).send({from: other})).to.be.fulfilled;
      await expect(challenges.methods.markAsExpired(challengeId).send({from: other})).to.be.eventually.rejected;
    });

    it(`Fails if challenge has not timed out yet`, async () => {
      await setTimestamp(now + challengeTimeout - 1);
      await expect(challenges.methods.markAsExpired(challengeId).send({from: other})).to.be.eventually.rejected;
    });

    it(`Emits event when marked as expired successfully`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      const penalty = utils.toWei('100', 'ether');
      expect(await challenges.methods.markAsExpired(challengeId).send({from: other}))
        .to.emitEvent('ChallengeTimeout')
        .withArgs({
          sheltererId: from, bundleId, challengeId, penalty
        });
    });

    it(`Can be called by anyone`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      await expect(challenges.methods.markAsExpired(challengeId).send({from: totalStranger})).to.be.fulfilled;
    });

    it(`Penalized shelterer stops being shelterer`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      challenges.methods.markAsExpired(challengeId).send({from: other});
      expect(await sheltering.methods.isSheltering(from, bundleId).call({from})).to.equal(false);
    });

    it(`Revokes shelterer's reward`, async () => {
      await sheltering.methods.removeShelterer(bundleId, from).send({from});
      await sheltering.methods.addShelterer(bundleId, from, shelteringReward).send({from});
      await payouts.methods.grantShelteringReward(from, storagePeriods * 13).send({from, value: shelteringReward});
      const currentPayoutPeriod = parseInt(await time.methods.currentPayoutPeriod().call(), 10);
      await setTimestamp(now + challengeTimeout + 1);
      await challenges.methods.markAsExpired(challengeId).send({from: other});
      expect(await payoutsStore.methods.available(resolver, currentPayoutPeriod + 5).call({from})).to.equal('0');
    });

    it(`Transfer funds to challenger`, async () => {
      await sheltering.methods.removeShelterer(bundleId, from).send({from});
      await sheltering.methods.addShelterer(bundleId, from, shelteringReward).send({from});
      await payouts.methods.grantShelteringReward(from, storagePeriods * 13).send({from, value: shelteringReward});
      await setTimestamp(now + challengeTimeout + 1);
      const stakeBefore = new BN(await stakeStore.methods.getStake(from).call());
      const balanceBefore = new BN(await web3.eth.getBalance(other));
      await challenges.methods.markAsExpired(challengeId).send({from: other, gasPrice: '0'});
      const balanceAfter = new BN(await web3.eth.getBalance(other));
      const stakeAfter = new BN(await stakeStore.methods.getStake(from).call());
      expect(balanceAfter.sub(balanceBefore).toString()).to
        .equal((fee.add(new BN(shelteringReward)).add(stakeBefore.sub(stakeAfter)))
          .toString());
    });

    it(`Deletes challenge with active count equal 1`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(true);
      await challenges.methods.markAsExpired(challengeId).send({from: other});
      expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(false);
    });

    describe('Marking system challenge as expired', () => {
      let systemChallengeCreationEvent;
      let systemChallengeId;
      let systemFee;
      const otherBundleId = utils.keccak256('otherBundleId');

      beforeEach(async () => {
        await bundleStore.methods.store(otherBundleId, other, storagePeriods).send({from});
        systemFee = fee.mul(new BN('5'));
        await challenges.methods.startForSystem(other, otherBundleId, 5).send({from, value: systemFee});
        [systemChallengeCreationEvent] = await challenges.getPastEvents('allEvents');
        systemChallengeId = systemChallengeCreationEvent.returnValues.challengeId;
        await stakeStore.methods.depositStake(other, ATLAS1_STORAGE_LIMIT, ATLAS).send({from, value: deposit});
        await stakeStore.methods.setStorageUsed(other, 1).send({from});
      });

      it(`Slashes stake, but slashed funds and fee are lost`, async () => {
        await setTimestamp(now + challengeTimeout + 1);
        const stakeBefore = new BN(await stakeStore.methods.getStake(other).call());
        const balanceBefore = new BN(await web3.eth.getBalance(totalStranger));
        await challenges.methods.markAsExpired(systemChallengeId).send({from: totalStranger, gasPrice: '0'});
        const balanceAfter = new BN(await web3.eth.getBalance(totalStranger));
        const stakeAfter = new BN(await stakeStore.methods.getStake(other).call());
        const firstPenalty = (deposit.div(new BN('100'))).toString();
        expect(balanceAfter.sub(balanceBefore).toString()).to.equal('0');
        expect(stakeBefore.sub(stakeAfter).toString()).to.equal(firstPenalty);
      });

      it(`Deletes challenge with active count bigger than 1`, async () => {
        await setTimestamp(now + challengeTimeout + 1);
        expect(await challenges.methods.getActiveChallengesCount(systemChallengeId).call()).to.equal('5');
        await challenges.methods.markAsExpired(systemChallengeId).send({from: totalStranger});
        expect(await challenges.methods.challengeIsInProgress(systemChallengeId).call()).to.equal(false);
      });
    });
  });
});
