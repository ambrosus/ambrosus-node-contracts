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
  SYSTEM_CHALLENGES_COUNT
} from '../../../src/consts';
import {ONE} from '../../helpers/consts';
import deploy from '../../helpers/deploy';
import utils from '../../helpers/utils';
import AtlasStakeStoreMockJson from '../../../build/contracts/AtlasStakeStoreMock.json';
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
  let roles;
  let atlasStakeStore;
  let kycWhitelist;
  let payouts;
  let from;
  let other;
  let resolver;
  let totalStranger;
  let fee;
  let time;
  let payoutsStore;
  let challengeId;
  let systemFee;
  const bundleId = utils.keccak256('someBundleId');
  const now = 1500000000;
  const shelteringReward = 130000;
  const storagePeriods = 1;
  const totalReward = 130000;

  const setTimestamp = async (timestamp) => time.methods.setCurrentTimestamp(timestamp).send({from});

  beforeEach(async () => {
    web3 = await createWeb3();
    [from, other, resolver, totalStranger] = await web3.eth.getAccounts();
    ({challenges, bundleStore, fees, sheltering, kycWhitelist, atlasStakeStore, time, payouts, payoutsStore, roles} = await deploy({
      web3,
      contracts: {
        challenges: true,
        bundleStore: true,
        fees: true,
        sheltering: true,
        atlasStakeStore: AtlasStakeStoreMockJson,
        apolloDepositStore: true,
        time: TimeMockJson,
        roles: true,
        kycWhitelist: true,
        config: true,
        payouts: true,
        payoutsStore: true,
        rolesStore: true
      }}));
    await setTimestamp(now);
    await bundleStore.methods.store(bundleId, from, storagePeriods).send({from});
    challengeId = await challenges.methods.getChallengeId(from, bundleId).call();
    fee = new BN(await fees.methods.getFeeForChallenge(storagePeriods).call());
    systemFee = fee.mul(new BN(SYSTEM_CHALLENGES_COUNT));
  });

  it('nextChallengeSequenceNumber = 0 after deployment', async () => {
    expect(await challenges.methods.nextChallengeSequenceNumber().call()).to.equal('0');
  });

  describe('Starting system challenges', () => {
    const otherBundleId = utils.keccak256('otherBundleId');

    it('Is context internal', async () => {
      await bundleStore.methods.store(otherBundleId, other, storagePeriods).send({from});
      await expect(challenges.methods.startForSystem(other, otherBundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee})).to.be.eventually.fulfilled;
      await expect(challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from: other, value: systemFee})).to.be.eventually.rejected;
    });

    it('Should emit event', async () => {
      expect(await challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee})).to
        .emitEvent('ChallengeCreated')
        .withArgs({sheltererId: from, bundleId, challengeId, count: SYSTEM_CHALLENGES_COUNT.toString()});
    });

    it(`Should increase nextChallengeSequenceNumber by challengesCount`, async () => {
      await challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee});
      expect(await challenges.methods.nextChallengeSequenceNumber().call()).to.equal(SYSTEM_CHALLENGES_COUNT.toString());
      await bundleStore.methods.store(otherBundleId, from, storagePeriods).send({from});
      await challenges.methods.startForSystem(from, otherBundleId, 100).send({from, value: fee.mul(new BN('100'))});
      expect(await challenges.methods.nextChallengeSequenceNumber().call()).to.equal((SYSTEM_CHALLENGES_COUNT + 100).toString());
    });

    it('sets challenge sequence number to nextChallengeSequenceNumber', async () => {
      await challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee});
      expect(await challenges.methods.getChallengeSequenceNumber(challengeId).call()).to.equal('0');

      await bundleStore.methods.store(otherBundleId, from, storagePeriods).send({from});
      await challenges.methods.startForSystem(from, otherBundleId, 100).send({from, value: fee.mul(new BN('100'))});
      const otherChallengeId = await challenges.methods.getChallengeId(from, otherBundleId).call();
      expect(await challenges.methods.getChallengeSequenceNumber(otherChallengeId).call()).to.equal(SYSTEM_CHALLENGES_COUNT.toString());
    });

    it('Stores challengerId as 0x0', async () => {
      await challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee});
      expect(await challenges.methods.getChallengeCreationTime(challengeId).call()).to.equal(now.toString());
      expect(await challenges.methods.getChallenger(challengeId).call()).to.equal('0x0000000000000000000000000000000000000000');
    });

    it('Fails if bundle has not been uploaded by provided account', async () => {
      await expect(challenges.methods.startForSystem(other, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee})).to.be.eventually.rejected;
    });

    it(`Fails if provided too small fee`, async () => {
      const tooSmallFee = systemFee.sub(ONE);
      await expect(challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: tooSmallFee})).to.be.eventually.rejected;
    });

    it(`Fails if provided fee that is too high`, async () => {
      const tooBigFee = systemFee.add(ONE);
      await expect(challenges.methods.startForSystem(from, bundleId, 5).send({from, value: tooBigFee})).to.be.eventually.rejected;
    });

    it('Fails if added same challenge twice', async () => {
      await expect(challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee})).to.be.eventually.fulfilled;
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
    beforeEach(async () => {
      await atlasStakeStore.methods.depositStake(other, ATLAS1_STORAGE_LIMIT).send({from, value: ATLAS1_STAKE});
      await sheltering.methods.addShelterer(bundleId, other, totalReward).send({from});
      challengeId = await challenges.methods.getChallengeId(other, bundleId).call();
    });

    it('Challenge is not in progress until started', async () => {
      expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(false);
    });

    it('Creates a challenge and emits an event', async () => {
      expect(await challenges.methods.start(other, bundleId).send({from, value: fee})).to
        .emitEvent('ChallengeCreated')
        .withArgs({sheltererId: other, bundleId, challengeId, count: '1'});
    });

    it(`Should increase nextChallengeSequenceNumber by 1`, async () => {
      await challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee});

      await challenges.methods.start(other, bundleId).send({from, value: fee});
      expect(await challenges.methods.nextChallengeSequenceNumber().call()).to.equal((SYSTEM_CHALLENGES_COUNT + 1).toString());
    });

    it('sets challenge sequence number to nextChallengeSequenceNumber', async () => {
      await challenges.methods.startForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT).send({from, value: systemFee});

      await challenges.methods.start(other, bundleId).send({from, value: fee});
      expect(await challenges.methods.getChallengeSequenceNumber(challengeId).call()).to.equal(SYSTEM_CHALLENGES_COUNT.toString());
    });

    it('Fails if bundle is not being sheltered by provided account', async () => {
      await expect(challenges.methods.start(from, bundleId).send({from, value: fee})).to.be.eventually.rejected;
      await expect(challenges.methods.start(other, bundleId).send({from: other, value: fee})).to.be.eventually.fulfilled;
    });

    it(`Fails if challenger has provided too low value`, async () => {
      const tooSmallFee = fee.sub(ONE);
      await expect(challenges.methods.start(other, bundleId).send({from, value: tooSmallFee})).to.be.eventually.rejected;
    });

    it(`Fails if challenger has provided too high value`, async () => {
      const tooBigFee = fee.add(ONE);
      await expect(challenges.methods.start(other, bundleId).send({from, value: tooBigFee})).to.be.eventually.rejected;
    });

    it('Fails if the challenge was added after bundle has expired', async () => {
      const expirationTime = await bundleStore.methods.getShelteringExpirationDate(bundleId, from).call();
      await setTimestamp(expirationTime + 1);
      await expect(challenges.methods.start(from, bundleId).send({from: other, value: fee})).to.be.eventually.rejected;
    });

    it('Fails if added same challenge twice', async () => {
      expect(await challenges.methods.start(other, bundleId).send({from, value: fee})).to.emitEvent('ChallengeCreated');
      await expect(challenges.methods.start(other, bundleId).send({from, value: fee})).to.be.eventually.rejected;
    });

    describe('Stores challenge correctly', () => {
      let challengeBlockTimestamp;
      let challengeCreationEvent;
      let challengeId;

      beforeEach(async () => {
        await challenges.methods.start(other, bundleId).send({from: other, value: fee});
        challengeBlockTimestamp = now;
        [challengeCreationEvent] = await challenges.getPastEvents('allEvents');
        ({challengeId} = challengeCreationEvent.returnValues);
      });

      it('Stores challenge id', async () => {
        expect(await challenges.methods.getChallengeId(other, bundleId).call()).to.equal(challengeId);
      });

      it('Shelterer id', async () => {
        expect(await challenges.methods.getChallengedShelterer(challengeId).call()).to.equal(other);
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
        expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(true);
      });
    });
  });

  describe('Resolving a challenge', () => {
    const url = 'url';

    const onboardAsAtlas = async (address) => {
      await kycWhitelist.methods.add(address, ATLAS).send({from});
      await roles.methods.onboardAsAtlas(url).send({from: address, value: ATLAS1_STAKE, gasPrice: '0'});
    };

    const lastChallengeId = async () => {
      const [challengeCreationEvent] = await challenges.getPastEvents('allEvents');
      return challengeCreationEvent.returnValues.challengeId;
    };

    beforeEach(async () => {
      await onboardAsAtlas(resolver);
      await atlasStakeStore.methods.depositStake(other, ATLAS1_STORAGE_LIMIT).send({from, value: ATLAS1_STAKE});
      await sheltering.methods.addShelterer(bundleId, other, totalReward).send({from});
      await challenges.methods.start(other, bundleId).send({from, value: fee});
      challengeId = await lastChallengeId();
    });

    it('canResolve returns true if challenge can be resolved', async () => {
      expect(await challenges.methods.canResolve(resolver, challengeId).call()).to.equal(true);
    });

    it('Stores resolver as a new shelterer', async () => {
      await challenges.methods.resolve(challengeId).send({from: resolver});
      expect(await sheltering.methods.isSheltering(bundleId, resolver).call()).to.equal(true);
    });

    it('Grants sheltering reward', async () => {
      await challenges.methods.resolve(challengeId).send({from: resolver});
      const currentPayoutPeriod = parseInt(await time.methods.currentPayoutPeriod().call(), 10);
      expect(await payoutsStore.methods.available(resolver, currentPayoutPeriod + 5).call({from})).not.to.equal('0');
    });

    it('Emits an event', async () => {
      expect(await challenges.methods.resolve(challengeId).send({from: resolver, gasPrice: '0'})).to
        .emitEvent('ChallengeResolved')
        .withArgs({sheltererId: other, bundleId, challengeId, resolverId: resolver});
    });

    it('Removes challenge if active count was 1', async () => {
      await challenges.methods.resolve(challengeId).send({from: resolver});
      expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(false);
    });

    it('Does not increase challenges sequence number if not a system challenge', async () => {
      await challenges.methods.resolve(challengeId).send({from: resolver});
      expect(await challenges.methods.getChallengeSequenceNumber(challengeId).call()).to.equal('0');
    });

    it('Fails if challenge does not exist', async () => {
      const fakeChallengeId = utils.keccak256('fakeChallengeId');
      expect(await challenges.methods.canResolve(resolver, fakeChallengeId).call()).to.equal(false);
      await expect(challenges.methods.resolve(fakeChallengeId).send({from: resolver})).to.be.eventually.rejected;
    });

    it('Fails if resolver is already sheltering challenged bundle', async () => {
      await bundleStore.methods.addShelterer(bundleId, resolver, shelteringReward).send({from});
      expect(await challenges.methods.canResolve(resolver, challengeId).call()).to.equal(false);
      await expect(challenges.methods.resolve(challengeId).send({from: resolver})).to.be.eventually.rejected;
    });

    it(`Fails if resolver can't store more bundles`, async () => {
      const allStorageUsed = ATLAS1_STORAGE_LIMIT;
      await atlasStakeStore.methods.setStorageUsed(resolver, allStorageUsed).send({from});
      expect(await challenges.methods.canResolve(resolver, challengeId).call()).to.equal(false);
      await expect(challenges.methods.resolve(challengeId).send({from: resolver})).to.be.eventually.rejected;
    });

    it('Decreases active count', async () => {
      const systemFee = fee.mul(new BN('3'));
      await challenges.methods.startForSystem(from, bundleId, 3).send({from, value: systemFee});
      challengeId = await lastChallengeId();
      await challenges.methods.resolve(challengeId).send({from: resolver});
      expect(await challenges.methods.getActiveChallengesCount(challengeId).call()).to.equal('2');
    });

    it('Increases sequence number for all resolutions but last', async () => {
      await onboardAsAtlas(totalStranger);
      const systemFee = fee.mul(new BN('2'));
      await challenges.methods.startForSystem(from, bundleId, 2).send({from, value: systemFee});
      challengeId = await lastChallengeId();
      expect(await challenges.methods.getChallengeSequenceNumber(challengeId).call()).to.equal('1');
      await challenges.methods.resolve(challengeId).send({from: resolver});
      expect(await challenges.methods.getChallengeSequenceNumber(challengeId).call()).to.equal('2');
      await challenges.methods.resolve(challengeId).send({from: totalStranger});
      expect(await challenges.methods.getChallengeSequenceNumber(challengeId).call()).to.equal('0');
    });

    it('Removes system challenge if active count was 1', async () => {
      await challenges.methods.startForSystem(from, bundleId, 1).send({from, value: fee});
      challengeId = await lastChallengeId();
      await challenges.methods.resolve(challengeId).send({from: resolver});
      expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(false);
    });
  });

  describe('Marking challenge as expired', () => {
    const challengeTimeout = 3 * DAY;

    beforeEach(async () => {
      await atlasStakeStore.methods.depositStake(other, ATLAS1_STORAGE_LIMIT).send({from, value: ATLAS1_STAKE});
      await sheltering.methods.addShelterer(bundleId, other, fee).send({from});
      await payouts.methods.grantShelteringReward(other, storagePeriods * 13).send({from, value: fee});

      await challenges.methods.start(other, bundleId).send({from, value: fee});
      const [challengeCreationEvent] = await challenges.getPastEvents('allEvents');
      ({challengeId} = challengeCreationEvent.returnValues);
    });

    it(`Fails if challenge does not exist`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      const fakeChallengeId = utils.keccak256('fakeChallengeId');
      await expect(challenges.methods.markAsExpired(fakeChallengeId).send({from})).to.be.eventually.rejected;
    });

    it(`Fails if challenge has already been marked as expired`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      await expect(challenges.methods.markAsExpired(challengeId).send({from})).to.be.fulfilled;
      await expect(challenges.methods.markAsExpired(challengeId).send({from})).to.be.eventually.rejected;
    });

    it(`Fails if challenge has not timed out yet`, async () => {
      await expect(challenges.methods.markAsExpired(challengeId).send({from})).to.be.eventually.rejected;
    });

    it(`Emits event when marked as expired successfully`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      const penalty = utils.toWei('100', 'ether');
      expect(await challenges.methods.markAsExpired(challengeId).send({from})).to
        .emitEvent('ChallengeTimeout')
        .withArgs({sheltererId: other, bundleId, challengeId, penalty});
    });

    it(`Can be called by anyone`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      await expect(challenges.methods.markAsExpired(challengeId).send({from: totalStranger})).to.be.fulfilled;
    });

    it(`Penalized shelterer stops being shelterer`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      challenges.methods.markAsExpired(challengeId).send({from});
      expect(await sheltering.methods.isSheltering(bundleId, resolver).call({from})).to.equal(false);
    });

    it(`Revokes shelterer's reward`, async () => {
      const currentPayoutPeriod = parseInt(await time.methods.currentPayoutPeriod().call(), 10);
      await setTimestamp(now + challengeTimeout + 1);
      await challenges.methods.markAsExpired(challengeId).send({from});
      expect(await payoutsStore.methods.available(resolver, currentPayoutPeriod + 5).call({from})).to.equal('0');
    });

    it(`Transfer funds to challenger`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      const stakeBefore = new BN(await atlasStakeStore.methods.getStake(other).call());
      const balanceBefore = new BN(await web3.eth.getBalance(from));
      await challenges.methods.markAsExpired(challengeId).send({from, gasPrice: '0'});
      const balanceAfter = new BN(await web3.eth.getBalance(from));
      const stakeAfter = new BN(await atlasStakeStore.methods.getStake(other).call());
      expect(balanceAfter.sub(balanceBefore).toString()).to
        .equal((fee.mul(new BN(2)).add(stakeBefore.sub(stakeAfter)))
          .toString());
    });

    it(`Deletes challenge with active count equal 1`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(true);
      await challenges.methods.markAsExpired(challengeId).send({from});
      expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(false);
    });
  });

  describe('Marking system challenge as expired', () => {
    const challengeTimeout = 3 * DAY;
    const url = 'url';
    let systemChallengeCreationEvent;
    let systemChallengeId;
    let systemFee;

    beforeEach(async () => {
      systemFee = fee.mul(new BN('5'));
      await challenges.methods.startForSystem(from, bundleId, 5).send({from, value: systemFee});
      [systemChallengeCreationEvent] = await challenges.getPastEvents('allEvents');
      systemChallengeId = systemChallengeCreationEvent.returnValues.challengeId;
    });

    it(`Returns fee to creator (full fee if no one resolved)`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      const balanceBefore = new BN(await web3.eth.getBalance(from));
      await challenges.methods.markAsExpired(systemChallengeId).send({from: totalStranger, gasPrice: '0'});
      const balanceAfter = new BN(await web3.eth.getBalance(from));
      expect(balanceAfter.sub(balanceBefore).toString()).to.equal(systemFee.toString());
    });

    it(`Returns fee to creator (part of the fee if partially resolved)`, async () => {
      await kycWhitelist.methods.add(resolver, ATLAS).send({from});
      await roles.methods.onboardAsAtlas(url).send({from: resolver, value: ATLAS1_STAKE, gasPrice: '0'});
      await challenges.methods.resolve(challengeId).send({from: resolver});

      await setTimestamp(now + challengeTimeout + 1);
      const balanceBefore = new BN(await web3.eth.getBalance(from));
      await challenges.methods.markAsExpired(systemChallengeId).send({from: totalStranger, gasPrice: '0'});
      const balanceAfter = new BN(await web3.eth.getBalance(from));
      expect(balanceAfter.sub(balanceBefore).toString()).to.equal(systemFee.sub(fee).toString());
    });

    it(`Deletes challenge with active count bigger than 1`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      expect(await challenges.methods.getActiveChallengesCount(systemChallengeId).call()).to.equal('5');
      await challenges.methods.markAsExpired(systemChallengeId).send({from: totalStranger});
      expect(await challenges.methods.challengeIsInProgress(systemChallengeId).call()).to.equal(false);
    });
  });
});
