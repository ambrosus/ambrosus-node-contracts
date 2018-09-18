/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3, makeSnapshot, restoreSnapshot, utils} from '../../../src/utils/web3_tools';
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
  let from;
  let other;
  let resolver;
  let totalStranger;
  let time;
  let challengeId;
  let userChallengeFee;
  let systemChallengeFee;
  let snapshotId;
  const bundleId = utils.keccak256('someBundleId');
  const now = 1500000000;
  const shelteringReward = 130000;
  const storagePeriods = 1;
  const totalReward = 130000;

  const startChallenge = async (sheltererId, bundleId, challengerId, fee) => challenges.methods.start(sheltererId, bundleId).send({from: challengerId, value: fee});
  const startChallengeForSystem = async (sheltererId, bundleId, challengeCount, challengerId, fee) => challenges.methods.startForSystem(sheltererId, bundleId, challengeCount).send({from: challengerId, value: fee});
  const resolveChallenge = async (challengeId, resolverId) => challenges.methods.resolve(challengeId).send({from: resolverId});
  const markChallengeAsExpired = async (challengeId, marker) => challenges.methods.markAsExpired(challengeId).send({from: marker, gasPrice: '0'});

  const getChallengeId = async (challengerId, bundleId) => challenges.methods.getChallengeId(challengerId, bundleId).call();
  const nextChallengeSequenceNumber = async () => challenges.methods.nextChallengeSequenceNumber().call();
  const getChallengeSequenceNumber = async (challengeId) => challenges.methods.getChallengeSequenceNumber(challengeId).call();
  const getChallengeCreationTime = async (challengeId) => challenges.methods.getChallengeCreationTime(challengeId).call();
  const getChallenger = async (challengeId) => challenges.methods.getChallenger(challengeId).call();
  const getChallengedShelterer = async (challengeId) => challenges.methods.getChallengedShelterer(challengeId).call();
  const getChallengedBundle = async (challengeId) => challenges.methods.getChallengedBundle(challengeId).call();
  const getChallengeFee = async (challengeId) => challenges.methods.getChallengeFee(challengeId).call();
  const getActiveChallengesCount = async (challengeId) => challenges.methods.getActiveChallengesCount(challengeId).call();
  const challengeIsInProgress = async (challengeId) => challenges.methods.challengeIsInProgress(challengeId).call();
  const canResolve = async (resolver, challengeId) => challenges.methods.canResolve(resolver, challengeId).call();

  const setTimestamp = async (timestamp) => time.methods.setCurrentTimestamp(timestamp).send({from});
  const addToKycWhitelist = async(candidate, role, requiredDeposit) => kycWhitelist.methods.add(candidate, role, requiredDeposit).send({from});
  const storeBundle = async (bundleId, sheltererId, storagePeriods) => bundleStore.methods.store(bundleId, sheltererId, storagePeriods).send({from});
  const addSheltererToBundle = async (bundleId, sheltererId, shelteringReward) => bundleStore.methods.addShelterer(bundleId, sheltererId, shelteringReward).send({from});
  const depositStake = async(stakerId, storageLimit, stakeValue) => atlasStakeStore.methods.depositStake(stakerId, storageLimit).send({from, value: stakeValue});
  const setStorageUsed = async (nodeId, storageUsed) => atlasStakeStore.methods.setStorageUsed(nodeId, storageUsed).send({from});
  const addShelterer = async(bundleId, sheltererId, shelteringReward) => sheltering.methods.addShelterer(bundleId, sheltererId).send({from, value: shelteringReward});
  const onboardAsAtlas = async(nodeUrl, nodeAddress, depositValue) => roles.methods.onboardAsAtlas(nodeUrl).send({from: nodeAddress, value: depositValue, gasPrice: '0'});

  const getShelteringExpirationDate = async(bundleId, sheltererId) => bundleStore.methods.getShelteringExpirationDate(bundleId, sheltererId).call();
  const getFeeForChallenge = async (storagePeriods) => fees.methods.getFeeForChallenge(storagePeriods).call();
  const isSheltering = async (bundleId, sheltererId) => sheltering.methods.isSheltering(bundleId, sheltererId).call();
  const getLastChallengeResolvedSequenceNumber = async (nodeId) => atlasStakeStore.methods.getLastChallengeResolvedSequenceNumber(nodeId).call();
  const getStake = async (nodeId) => atlasStakeStore.methods.getStake(nodeId).call();

  before(async () => {
    web3 = await createWeb3();
    [from, other, resolver, totalStranger] = await web3.eth.getAccounts();
    ({challenges, bundleStore, fees, sheltering, kycWhitelist, atlasStakeStore, time, roles} = await deploy({
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
    await storeBundle(bundleId, from, storagePeriods);
    userChallengeFee = new BN(await getFeeForChallenge(storagePeriods));
    systemChallengeFee = userChallengeFee.mul(new BN(SYSTEM_CHALLENGES_COUNT));
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
    challengeId = await getChallengeId(from, bundleId);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  it('nextChallengeSequenceNumber = 1 after deployment', async () => {
    expect(await nextChallengeSequenceNumber()).to.equal('1');
  });

  describe('Starting system challenges', () => {
    const otherBundleId = utils.keccak256('otherBundleId');

    it('Is context internal', async () => {
      await storeBundle(otherBundleId, other, storagePeriods);
      await expect(startChallengeForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT, other, systemChallengeFee)).to.be.eventually.rejected;
      await expect(startChallengeForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT, from, systemChallengeFee)).to.be.eventually.fulfilled;
    });

    it('Should emit event', async () => {
      expect(await startChallengeForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT, from, systemChallengeFee)).to
        .emitEvent('ChallengeCreated')
        .withArgs({sheltererId: from, bundleId, challengeId, count: SYSTEM_CHALLENGES_COUNT.toString()});
    });

    it(`Should increase nextChallengeSequenceNumber by challengesCount`, async () => {
      await startChallengeForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT, from, systemChallengeFee);
      expect(await nextChallengeSequenceNumber()).to.equal((SYSTEM_CHALLENGES_COUNT + 1).toString());
      await storeBundle(otherBundleId, from, storagePeriods);
      await startChallengeForSystem(from, otherBundleId, 100, from, userChallengeFee.mul(new BN('100')));
      expect(await nextChallengeSequenceNumber()).to.equal((SYSTEM_CHALLENGES_COUNT + 101).toString());
    });

    it('Sets challenge sequence number to nextChallengeSequenceNumber', async () => {
      await startChallengeForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT, from, systemChallengeFee);
      expect(await getChallengeSequenceNumber(challengeId)).to.equal('1');

      await storeBundle(otherBundleId, from, storagePeriods);
      await startChallengeForSystem(from, otherBundleId, 100, from, userChallengeFee.mul(new BN('100')));
      const otherChallengeId = await getChallengeId(from, otherBundleId);
      expect(await getChallengeSequenceNumber(otherChallengeId)).to.equal((SYSTEM_CHALLENGES_COUNT + 1).toString());
    });

    it('Stores challengerId as 0x0', async () => {
      await startChallengeForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT, from, systemChallengeFee);
      expect(await getChallengeCreationTime(challengeId)).to.equal(now.toString());
      expect(await getChallenger(challengeId)).to.equal('0x0000000000000000000000000000000000000000');
    });

    it('Fails if bundle has not been uploaded by provided account', async () => {
      await expect(startChallengeForSystem(other, bundleId, SYSTEM_CHALLENGES_COUNT, from, systemChallengeFee)).to.be.eventually.rejected;
    });

    it(`Fails if provided too small fee`, async () => {
      const tooSmallFee = systemChallengeFee.sub(ONE);
      await expect(startChallengeForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT, from, tooSmallFee)).to.be.eventually.rejected;
    });

    it(`Fails if provided fee that is too high`, async () => {
      const tooBigFee = systemChallengeFee.add(ONE);
      await expect(startChallengeForSystem(from, bundleId, 5, from, tooBigFee)).to.be.eventually.rejected;
    });

    it('Fails if added same challenge twice', async () => {
      await expect(startChallengeForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT, from, systemChallengeFee)).to.be.eventually.fulfilled;
      await expect(startChallengeForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT, from, systemChallengeFee)).to.be.eventually.rejected;
    });

    describe('Stores system challenges correctly', () => {
      const nullAddress = '0x0000000000000000000000000000000000000000';
      let challengeBlockTimestamp;
      let challengeCreationEvent;
      let challengeId;

      beforeEach(async () => {
        await startChallengeForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT, from, systemChallengeFee);
        challengeBlockTimestamp = now;
        [challengeCreationEvent] = await challenges.getPastEvents('allEvents');
        ({challengeId} = challengeCreationEvent.returnValues);
      });

      it('Stores challenge id', async () => {
        expect(await getChallengeId(from, bundleId)).to.equal(challengeId);
      });

      it('Shelterer id', async () => {
        expect(await getChallengedShelterer(challengeId)).to.equal(from);
      });

      it('Bundle id', async () => {
        expect(await getChallengedBundle(challengeId)).to.equal(bundleId);
      });

      it('Challenger id', async () => {
        expect(await getChallenger(challengeId)).to.equal(nullAddress);
      });

      it('Challenge fee', async () => {
        expect(await getChallengeFee(challengeId)).to.equal(systemChallengeFee.div(new BN(SYSTEM_CHALLENGES_COUNT)).toString());
      });

      it('Challenge setup time', async () => {
        expect(await getChallengeCreationTime(challengeId)).to.equal(challengeBlockTimestamp.toString());
      });

      it('Challenge active count', async () => {
        expect(await getActiveChallengesCount(challengeId)).to.equal(SYSTEM_CHALLENGES_COUNT.toString());
      });

      it('Challenge in progress', async () => {
        expect(await challengeIsInProgress(challengeId)).to.equal(true);
      });
    });
  });

  describe('Starting user challenge', () => {
    beforeEach(async () => {
      await depositStake(other, ATLAS1_STORAGE_LIMIT, ATLAS1_STAKE);
      await addShelterer(bundleId, other, totalReward);
      challengeId = await getChallengeId(other, bundleId);
    });

    it('Challenge is not in progress until started', async () => {
      expect(await challengeIsInProgress(challengeId)).to.equal(false);
    });

    it('Creates a challenge and emits an event', async () => {
      expect(await startChallenge(other, bundleId, from, userChallengeFee)).to
        .emitEvent('ChallengeCreated')
        .withArgs({sheltererId: other, bundleId, challengeId, count: '1'});
    });

    it(`Should increase nextChallengeSequenceNumber by 1`, async () => {
      await startChallengeForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT, from, systemChallengeFee);

      await startChallenge(other, bundleId, from, userChallengeFee);
      expect(await nextChallengeSequenceNumber()).to.equal((SYSTEM_CHALLENGES_COUNT + 2).toString());
    });

    it('Sets challenge sequence number to nextChallengeSequenceNumber', async () => {
      await startChallengeForSystem(from, bundleId, SYSTEM_CHALLENGES_COUNT, from, systemChallengeFee);

      await startChallenge(other, bundleId, from, userChallengeFee);
      expect(await getChallengeSequenceNumber(challengeId)).to.equal((SYSTEM_CHALLENGES_COUNT + 1).toString());
    });

    it('Fails if bundle is not being sheltered by provided account', async () => {
      await expect(startChallenge(from, bundleId, from, userChallengeFee)).to.be.eventually.rejected;
      await expect(startChallenge(other, bundleId, other, userChallengeFee)).to.be.eventually.fulfilled;
    });

    it(`Fails if challenger has provided too low value`, async () => {
      const tooSmallFee = userChallengeFee.sub(ONE);
      await expect(startChallenge(other, bundleId, from, tooSmallFee)).to.be.eventually.rejected;
    });

    it(`Fails if challenger has provided too high value`, async () => {
      const tooBigFee = userChallengeFee.add(ONE);
      await expect(startChallenge(other, bundleId, from, tooBigFee)).to.be.eventually.rejected;
    });

    it('Fails if the challenge was added after bundle has expired', async () => {
      const expirationTime = await getShelteringExpirationDate(bundleId, other);
      await setTimestamp(expirationTime + 1);
      await expect(startChallenge(other, bundleId, from, userChallengeFee)).to.be.eventually.rejected;
    });

    it('Fails if added same challenge twice', async () => {
      expect(await startChallenge(other, bundleId, from, userChallengeFee)).to.emitEvent('ChallengeCreated');
      await expect(startChallenge(other, bundleId, from, userChallengeFee)).to.be.eventually.rejected;
    });

    describe('Stores challenge correctly', () => {
      let challengeBlockTimestamp;
      let challengeCreationEvent;
      let challengeId;

      beforeEach(async () => {
        await startChallenge(other, bundleId, from, userChallengeFee);
        challengeBlockTimestamp = now;
        [challengeCreationEvent] = await challenges.getPastEvents('allEvents');
        ({challengeId} = challengeCreationEvent.returnValues);
      });

      it('Stores challenge id', async () => {
        expect(await getChallengeId(other, bundleId)).to.equal(challengeId);
      });

      it('Shelterer id', async () => {
        expect(await getChallengedShelterer(challengeId)).to.equal(other);
      });

      it('Bundle id', async () => {
        expect(await getChallengedBundle(challengeId)).to.equal(bundleId);
      });

      it('Challenger id', async () => {
        expect(await getChallenger(challengeId)).to.equal(from);
      });

      it('Challenge fee', async () => {
        expect(await getChallengeFee(challengeId)).to.equal(userChallengeFee.toString());
      });

      it('Challenge setup time', async () => {
        expect(await getChallengeCreationTime(challengeId)).to.equal(challengeBlockTimestamp.toString());
      });

      it('Challenge active count', async () => {
        expect(await getActiveChallengesCount(challengeId)).to.equal('1');
      });

      it('Challenge in progress', async () => {
        expect(await challengeIsInProgress(challengeId)).to.equal(true);
      });
    });
  });

  describe('Resolving a challenge', () => {
    const url = 'url';

    const atlasOnboarding = async (address) => {
      await addToKycWhitelist(address, ATLAS, ATLAS1_STAKE);
      await onboardAsAtlas(url, address, ATLAS1_STAKE);
    };

    const lastChallengeId = async () => {
      const [challengeCreationEvent] = await challenges.getPastEvents('allEvents');
      return challengeCreationEvent.returnValues.challengeId;
    };

    beforeEach(async () => {
      await atlasOnboarding(resolver);
      await depositStake(other, ATLAS1_STORAGE_LIMIT, ATLAS1_STAKE);
      await addShelterer(bundleId, other, totalReward);
      await startChallenge(other, bundleId, from, userChallengeFee);
      challengeId = await lastChallengeId();
    });

    it('canResolve returns true if challenge can be resolved', async () => {
      expect(await canResolve(resolver, challengeId)).to.equal(true);
    });

    it('Stores resolver as a new shelterer', async () => {
      await resolveChallenge(challengeId, resolver);
      expect(await isSheltering(bundleId, resolver)).to.equal(true);
    });

    it('Updates last resolved challenge sequence number', async () => {
      const sequenceNumber = await getChallengeSequenceNumber(challengeId);
      await resolveChallenge(challengeId, resolver);
      expect(await getLastChallengeResolvedSequenceNumber(resolver)).to.equal(sequenceNumber);
    });

    it('Emits an event', async () => {
      expect(await resolveChallenge(challengeId, resolver)).to
        .emitEvent('ChallengeResolved')
        .withArgs({sheltererId: other, bundleId, challengeId, resolverId: resolver});
    });

    it('Removes challenge if active count was 1', async () => {
      await resolveChallenge(challengeId, resolver);
      expect(await challengeIsInProgress(challengeId)).to.equal(false);
    });

    it('Does not increase challenges sequence number if not a system challenge', async () => {
      await resolveChallenge(challengeId, resolver);
      expect(await getChallengeSequenceNumber(challengeId)).to.equal('0');
    });

    it('Fails if challenge does not exist', async () => {
      const fakeChallengeId = utils.keccak256('fakeChallengeId');
      expect(await canResolve(resolver, fakeChallengeId)).to.equal(false);
      await expect(resolveChallenge(fakeChallengeId, resolver)).to.be.eventually.rejected;
    });

    it('Fails if resolver is already sheltering challenged bundle', async () => {
      await addSheltererToBundle(bundleId, resolver, shelteringReward);
      expect(await canResolve(resolver, challengeId)).to.equal(false);
      await expect(resolveChallenge(challengeId, resolver)).to.be.eventually.rejected;
    });

    it(`Fails if resolver can't store more bundles`, async () => {
      await setStorageUsed(resolver, ATLAS1_STORAGE_LIMIT);
      expect(await canResolve(resolver, challengeId)).to.equal(false);
      await expect(resolveChallenge(challengeId, resolver)).to.be.eventually.rejected;
    });

    it('Decreases active count', async () => {
      const systemFee = userChallengeFee.mul(new BN('3'));
      await startChallengeForSystem(from, bundleId, 3, from, systemFee);
      challengeId = await lastChallengeId();
      await resolveChallenge(challengeId, resolver);
      expect(await getActiveChallengesCount(challengeId)).to.equal('2');
    });

    it('Increases sequence number for all resolutions but last', async () => {
      await atlasOnboarding(totalStranger);
      const systemFee = userChallengeFee.mul(new BN('2'));
      await startChallengeForSystem(from, bundleId, 2, from, systemFee);
      challengeId = await lastChallengeId();
      expect(await getChallengeSequenceNumber(challengeId)).to.equal('2');
      await resolveChallenge(challengeId, resolver);
      expect(await getChallengeSequenceNumber(challengeId)).to.equal('3');
      await resolveChallenge(challengeId, totalStranger);
      expect(await getChallengeSequenceNumber(challengeId)).to.equal('0');
    });

    it('Removes system challenge if active count was 1', async () => {
      await startChallengeForSystem(from, bundleId, 1, from, userChallengeFee);
      challengeId = await lastChallengeId();
      await resolveChallenge(challengeId, resolver);
      expect(await challengeIsInProgress(challengeId)).to.equal(false);
    });
  });

  describe('Marking challenge as expired', () => {
    const challengeTimeout = 3 * DAY;

    beforeEach(async () => {
      await depositStake(other, ATLAS1_STORAGE_LIMIT, ATLAS1_STAKE);
      await addShelterer(bundleId, other, userChallengeFee);

      await startChallenge(other, bundleId, from, userChallengeFee);
      const [challengeCreationEvent] = await challenges.getPastEvents('allEvents');
      ({challengeId} = challengeCreationEvent.returnValues);
    });

    it(`Fails if challenge does not exist`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      const fakeChallengeId = utils.keccak256('fakeChallengeId');
      await expect(markChallengeAsExpired(fakeChallengeId, from)).to.be.eventually.rejected;
    });

    it(`Fails if challenge has already been marked as expired`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      await expect(markChallengeAsExpired(challengeId, from)).to.be.fulfilled;
      await expect(markChallengeAsExpired(challengeId, from)).to.be.eventually.rejected;
    });

    it(`Fails if challenge has not timed out yet`, async () => {
      await expect(markChallengeAsExpired(challengeId, from)).to.be.eventually.rejected;
    });

    it(`Emits event when marked as expired successfully`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      const penalty = utils.toWei('100', 'ether');
      expect(await markChallengeAsExpired(challengeId, from)).to
        .emitEvent('ChallengeTimeout')
        .withArgs({sheltererId: other, bundleId, challengeId, penalty});
    });

    it(`Can be called by anyone`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      await expect(markChallengeAsExpired(challengeId, totalStranger)).to.be.fulfilled;
    });

    it(`Penalized shelterer stops being shelterer`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      markChallengeAsExpired(challengeId, from);
      expect(await isSheltering(bundleId, resolver)).to.equal(false);
    });

    it(`Transfer funds to challenger`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      const stakeBefore = new BN(await getStake(other));
      const balanceBefore = new BN(await web3.eth.getBalance(from));
      await markChallengeAsExpired(challengeId, from);
      const balanceAfter = new BN(await web3.eth.getBalance(from));
      const stakeAfter = new BN(await getStake(other));
      expect(balanceAfter.sub(balanceBefore).toString()).to
        .equal((userChallengeFee.mul(new BN(2)).add(stakeBefore.sub(stakeAfter)))
          .toString());
    });

    it(`Deletes challenge with active count equal 1`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      expect(await challengeIsInProgress(challengeId)).to.equal(true);
      await markChallengeAsExpired(challengeId, from);
      expect(await challengeIsInProgress(challengeId)).to.equal(false);
    });
  });

  describe('Marking system challenge as expired', () => {
    const challengeTimeout = 3 * DAY;
    const url = 'url';
    let systemChallengeCreationEvent;
    let systemChallengeId;
    let systemFee;

    beforeEach(async () => {
      systemFee = userChallengeFee.mul(new BN('5'));
      await startChallengeForSystem(from, bundleId, 5, from, systemFee);
      [systemChallengeCreationEvent] = await challenges.getPastEvents('allEvents');
      systemChallengeId = systemChallengeCreationEvent.returnValues.challengeId;
    });

    it(`Returns fee to creator (full fee if no one resolved)`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      const balanceBefore = new BN(await web3.eth.getBalance(from));
      await markChallengeAsExpired(systemChallengeId, totalStranger);
      const balanceAfter = new BN(await web3.eth.getBalance(from));
      expect(balanceAfter.sub(balanceBefore).toString()).to.equal(systemFee.toString());
    });

    it(`Returns fee to creator (part of the fee if partially resolved)`, async () => {
      await addToKycWhitelist(resolver, ATLAS, ATLAS1_STAKE);
      await onboardAsAtlas(url, resolver, ATLAS1_STAKE);
      await resolveChallenge(systemChallengeId, resolver);

      await setTimestamp(now + challengeTimeout + 1);
      const balanceBefore = new BN(await web3.eth.getBalance(from));
      await markChallengeAsExpired(systemChallengeId, totalStranger);
      const balanceAfter = new BN(await web3.eth.getBalance(from));
      expect(balanceAfter.sub(balanceBefore).toString()).to.equal(systemFee.sub(userChallengeFee).toString());
    });

    it(`Deletes challenge with active count bigger than 1`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      expect(await getActiveChallengesCount(systemChallengeId)).to.equal('5');
      await markChallengeAsExpired(systemChallengeId, totalStranger);
      expect(await challengeIsInProgress(systemChallengeId)).to.equal(false);
    });
  });
});
