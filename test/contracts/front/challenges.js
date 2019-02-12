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
  ATLAS1_STAKE
} from '../../../src/constants';
import {ONE, DAY, SYSTEM_CHALLENGES_COUNT} from '../../helpers/consts';
import deploy from '../../helpers/deploy';
import AtlasStakeStoreMockJson from '../../../src/contracts/AtlasStakeStoreMock.json';
import ChallengesStoreMockJson from '../../../src/contracts/ChallengesStoreMock.json';
import TimeMockJson from '../../../src/contracts/TimeMock.json';
import observeBalanceChange from '../../helpers/web3BalanceObserver';
import {expectEventEmission} from '../../helpers/web3EventObserver';

chai.use(chaiEmitEvents);

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Challenges Contract', () => {
  let web3;
  let challenges;
  let challengesStore;
  let challengesEventEmitter;
  let bundleStore;
  let sheltering;
  let config;
  let fees;
  let roles;
  let atlasStakeStore;
  let kycWhitelist;
  let challenger;
  let context;
  let uploader;
  let shelterer;
  let resolver;
  let totalStranger;
  let time;
  let challengeId;
  let systemChallengeId;
  let userChallengeFee;
  let systemChallengeFee;
  let snapshotId;
  const bundleId = utils.keccak256('someBundleId');
  const now = 1500000000;
  const shelteringReward = 130000;
  const storagePeriods = 1;
  const totalReward = 130000;

  const startChallenge = async (sheltererId, bundleId, challengerId, fee) => challenges.methods.start(sheltererId, bundleId).send({from: challengerId, value: fee});
  const startChallengeForSystem = async (uploaderId, bundleId, challengeCount, challengerId, fee) => challenges.methods.startForSystem(uploaderId, bundleId, challengeCount).send({from: challengerId, value: fee});
  const resolveChallenge = async (challengeId, resolverId) => challenges.methods.resolve(challengeId).send({from: resolverId});
  const markChallengeAsExpired = async (challengeId, marker) => challenges.methods.markAsExpired(challengeId).send({from: marker, gasPrice: '0'});
  const getCooldown = async () => challenges.methods.getCooldown().call();

  const getChallengeId = async (sheltererId, bundleId) => challenges.methods.getChallengeId(sheltererId, bundleId).call();
  const getChallengeSequenceNumber = async (challengeId) => challenges.methods.getChallengeSequenceNumber(challengeId).call();
  const getChallengeCreationTime = async (challengeId) => challenges.methods.getChallengeCreationTime(challengeId).call();
  const getChallenger = async (challengeId) => challenges.methods.getChallenger(challengeId).call();
  const getChallengedShelterer = async (challengeId) => challenges.methods.getChallengedShelterer(challengeId).call();
  const getChallengedBundle = async (challengeId) => challenges.methods.getChallengedBundle(challengeId).call();
  const getChallengeFee = async (challengeId) => challenges.methods.getChallengeFee(challengeId).call();
  const getActiveChallengesCount = async (challengeId) => challenges.methods.getActiveChallengesCount(challengeId).call();
  const challengeIsInProgress = async (challengeId) => challenges.methods.challengeIsInProgress(challengeId).call();
  const canResolve = async (resolver, challengeId) => challenges.methods.canResolve(resolver, challengeId).call();

  const setTimestamp = async (timestamp) => time.methods.setCurrentTimestamp(timestamp).send({from: context});
  const addToKycWhitelist = async(candidate, role, requiredDeposit) => kycWhitelist.methods.add(candidate, role, requiredDeposit).send({from: context});
  const storeBundle = async (bundleId, sheltererId, storagePeriods, currentTimestamp) => bundleStore.methods.store(bundleId, sheltererId, storagePeriods, currentTimestamp).send({from: context});
  const addSheltererToBundle = async (bundleId, sheltererId, shelteringReward, payoutPeriodsReduction, currentTimestamp) =>
    bundleStore.methods.addShelterer(bundleId, sheltererId, shelteringReward, payoutPeriodsReduction, currentTimestamp).send({from: context});
  const depositStake = async (stakerId, stakeValue) => atlasStakeStore.methods.depositStake(stakerId).send({from: context, value: stakeValue});
  const setStake = async (nodeId, stake) => atlasStakeStore.methods.setStakeAmount(nodeId, stake).send({from: context});
  const setNumberOfStakers = async (numberOfStakers) => atlasStakeStore.methods.setNumberOfStakers(numberOfStakers).send({from: context});
  const addShelterer = async (bundleId, sheltererId, shelteringReward) => sheltering.methods.addShelterer(bundleId, sheltererId).send({from: context, value: shelteringReward});
  const onboardAsAtlas = async(nodeUrl, nodeAddress, depositValue) => roles.methods.onboardAsAtlas(nodeUrl).send({from: nodeAddress, value: depositValue, gasPrice: '0'});

  const getShelteringExpirationDate = async(bundleId, sheltererId) => sheltering.methods.getShelteringExpirationDate(bundleId, sheltererId).call();
  const getFeeForChallenge = async (storagePeriods) => fees.methods.getFeeForChallenge(storagePeriods).call();
  const isSheltering = async (bundleId, sheltererId) => sheltering.methods.isSheltering(bundleId, sheltererId).call();
  const getLastChallengeResolvedSequenceNumber = async (nodeId) => atlasStakeStore.methods.getLastChallengeResolvedSequenceNumber(nodeId).call();
  const setLastChallengeResolvedSequenceNumber = async (nodeId, sequenceNumber) => atlasStakeStore.methods.updateLastChallengeResolvedSequenceNumber(nodeId, sequenceNumber).send({from: context});
  const getStake = async (nodeId) => atlasStakeStore.methods.getStake(nodeId).call();
  const nextChallengeSequenceNumber = async () => challengesStore.methods.getNextChallengeSequenceNumber().call();
  // eslint-disable-next-line new-cap
  const getCooldownTimeout = async () => parseInt(await config.methods.COOLDOWN_TIMEOUT().call(), 10);

  before(async () => {
    web3 = await createWeb3();
    [context, challenger, uploader, resolver, shelterer, totalStranger] = await web3.eth.getAccounts();
    ({challenges, challengesStore, bundleStore, fees, sheltering, kycWhitelist, atlasStakeStore, time, roles, config, challengesEventEmitter} = await deploy({
      web3,
      contracts: {
        challenges: true,
        challengesStore: ChallengesStoreMockJson,
        bundleStore: true,
        fees: true,
        sheltering: true,
        atlasStakeStore: AtlasStakeStoreMockJson,
        apolloDepositStore: true,
        time: TimeMockJson,
        roles: true,
        kycWhitelist: true,
        kycWhitelistStore: true,
        config: true,
        payouts: true,
        payoutsStore: true,
        rolesStore: true,
        challengesEventEmitter: true,
        rolesEventEmitter: true
      }}));
    await setTimestamp(now);
    await storeBundle(bundleId, uploader, storagePeriods, now);
    userChallengeFee = new BN(await getFeeForChallenge(storagePeriods));
    systemChallengeFee = userChallengeFee.mul(new BN(SYSTEM_CHALLENGES_COUNT));
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
    challengeId = await getChallengeId(shelterer, bundleId);
    systemChallengeId = await getChallengeId(uploader, bundleId);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('Starting system challenges', () => {
    const otherBundleId = utils.keccak256('otherBundleId');

    it('Is context internal', async () => {
      await expect(startChallengeForSystem(uploader, bundleId, SYSTEM_CHALLENGES_COUNT, challenger, systemChallengeFee)).to.be.eventually.rejected;
      await expect(startChallengeForSystem(uploader, bundleId, SYSTEM_CHALLENGES_COUNT, context, systemChallengeFee)).to.be.eventually.fulfilled;
    });

    it('Emits proper event', async () => {
      await expectEventEmission(
        web3,
        () => startChallengeForSystem(uploader, bundleId, SYSTEM_CHALLENGES_COUNT, context, systemChallengeFee),
        challengesEventEmitter,
        'ChallengeCreated',
        {
          sheltererId: uploader,
          bundleId,
          count: SYSTEM_CHALLENGES_COUNT.toString()
        }
      );
    });

    it(`Should increase nextChallengeSequenceNumber by challengesCount`, async () => {
      await startChallengeForSystem(uploader, bundleId, SYSTEM_CHALLENGES_COUNT, context, systemChallengeFee);
      expect(await nextChallengeSequenceNumber()).to.equal((SYSTEM_CHALLENGES_COUNT + 1).toString());
      await storeBundle(otherBundleId, uploader, storagePeriods, now);
      await startChallengeForSystem(uploader, otherBundleId, 100, context, userChallengeFee.mul(new BN('100')));
      expect(await nextChallengeSequenceNumber()).to.equal((SYSTEM_CHALLENGES_COUNT + 101).toString());
    });

    it('Sets challenge sequence number to nextChallengeSequenceNumber', async () => {
      await startChallengeForSystem(uploader, bundleId, SYSTEM_CHALLENGES_COUNT, context, systemChallengeFee);
      expect(await getChallengeSequenceNumber(systemChallengeId)).to.equal('1');

      await storeBundle(otherBundleId, uploader, storagePeriods, now);
      await startChallengeForSystem(uploader, otherBundleId, 100, context, userChallengeFee.mul(new BN('100')));
      const otherChallengeId = await getChallengeId(uploader, otherBundleId);
      expect(await getChallengeSequenceNumber(otherChallengeId)).to.equal((SYSTEM_CHALLENGES_COUNT + 1).toString());
    });

    it('Stores challengerId as 0x0', async () => {
      await startChallengeForSystem(uploader, bundleId, SYSTEM_CHALLENGES_COUNT, context, systemChallengeFee);
      expect(await getChallengeCreationTime(systemChallengeId)).to.equal(now.toString());
      expect(await getChallenger(systemChallengeId)).to.equal('0x0000000000000000000000000000000000000000');
    });

    it('Fails if bundle has not been uploaded by provided account', async () => {
      await expect(startChallengeForSystem(totalStranger, bundleId, SYSTEM_CHALLENGES_COUNT, context, systemChallengeFee)).to.be.eventually.rejected;
    });

    it(`Fails if provided fee is too small`, async () => {
      const tooSmallFee = systemChallengeFee.sub(ONE);
      await expect(startChallengeForSystem(uploader, bundleId, SYSTEM_CHALLENGES_COUNT, context, tooSmallFee)).to.be.eventually.rejected;
    });

    it(`Fails if provided fee that is too high`, async () => {
      const tooBigFee = systemChallengeFee.add(ONE);
      await expect(startChallengeForSystem(uploader, bundleId, SYSTEM_CHALLENGES_COUNT, context, tooBigFee)).to.be.eventually.rejected;
    });

    it('Fails if added same challenge twice', async () => {
      await expect(startChallengeForSystem(uploader, bundleId, SYSTEM_CHALLENGES_COUNT, context, systemChallengeFee)).to.be.eventually.fulfilled;
      await expect(startChallengeForSystem(uploader, bundleId, SYSTEM_CHALLENGES_COUNT, context, systemChallengeFee)).to.be.eventually.rejected;
    });

    describe('Stores system challenges correctly', () => {
      const nullAddress = '0x0000000000000000000000000000000000000000';
      let challengeBlockTimestamp;
      let challengeCreationEvent;
      let challengeId;

      beforeEach(async () => {
        await startChallengeForSystem(uploader, bundleId, SYSTEM_CHALLENGES_COUNT, context, systemChallengeFee);
        challengeBlockTimestamp = now;
        [challengeCreationEvent] = await challengesEventEmitter.getPastEvents('allEvents');
        ({challengeId} = challengeCreationEvent.returnValues);
      });

      it('Stores challenge id', async () => {
        expect(await getChallengeId(uploader, bundleId)).to.equal(challengeId);
      });

      it('Shelterer id', async () => {
        expect(await getChallengedShelterer(challengeId)).to.equal(uploader);
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
      await depositStake(shelterer, ATLAS1_STAKE);
      await addShelterer(bundleId, shelterer, totalReward);
    });

    it('Emits proper event', async () => {
      await expectEventEmission(
        web3,
        () => startChallenge(shelterer, bundleId, challenger, userChallengeFee),
        challengesEventEmitter,
        'ChallengeCreated',
        {
          sheltererId: shelterer,
          bundleId,
          count: '1'
        });
    });

    it('Challenge is not in progress until started', async () => {
      expect(await challengeIsInProgress(challengeId)).to.equal(false);
    });

    it(`Should increase nextChallengeSequenceNumber by 1`, async () => {
      await setNumberOfStakers(13);
      await startChallengeForSystem(uploader, bundleId, SYSTEM_CHALLENGES_COUNT, context, systemChallengeFee);
      await startChallenge(shelterer, bundleId, challenger, userChallengeFee);
      expect(await nextChallengeSequenceNumber()).to.equal((SYSTEM_CHALLENGES_COUNT + 2).toString());
    });

    it('Sets challenge sequence number to nextChallengeSequenceNumber', async () => {
      await setNumberOfStakers(13);
      await startChallengeForSystem(uploader, bundleId, SYSTEM_CHALLENGES_COUNT, context, systemChallengeFee);
      await startChallenge(shelterer, bundleId, challenger, userChallengeFee);
      expect(await getChallengeSequenceNumber(challengeId)).to.equal((SYSTEM_CHALLENGES_COUNT + 1).toString());
    });

    it('Fails if bundle is not being sheltered by provided account', async () => {
      await expect(startChallenge(totalStranger, bundleId, challenger, userChallengeFee)).to.be.eventually.rejected;
      await expect(startChallenge(shelterer, bundleId, challenger, userChallengeFee)).to.be.eventually.fulfilled;
    });

    it(`Fails if challenger has provided too low value`, async () => {
      const tooSmallFee = userChallengeFee.sub(ONE);
      await expect(startChallenge(shelterer, bundleId, challenger, tooSmallFee)).to.be.eventually.rejected;
    });

    it(`Fails if challenger has provided too high value`, async () => {
      const tooBigFee = userChallengeFee.add(ONE);
      await expect(startChallenge(shelterer, bundleId, challenger, tooBigFee)).to.be.eventually.rejected;
    });

    it('Fails if the challenge was added after bundle has expired', async () => {
      const expirationTime = await getShelteringExpirationDate(bundleId, shelterer);
      await setTimestamp(expirationTime + 1);
      await expect(startChallenge(shelterer, bundleId, challenger, userChallengeFee)).to.be.eventually.rejected;
    });

    it('Fails if added same challenge twice', async () => {
      await expect(startChallenge(shelterer, bundleId, challenger, userChallengeFee)).to.be.eventually.fulfilled;
      await expect(startChallenge(shelterer, bundleId, challenger, userChallengeFee)).to.be.eventually.rejected;
    });

    it('Fails to create challenge on the uploader', async () => {
      await expect(startChallenge(uploader, bundleId, challenger, userChallengeFee)).to.be.eventually.rejected;
    });

    it('Fails to create a challenge when the sheltering cap on the bundle has been reached', async () => {
      await startChallengeForSystem(uploader, bundleId, SYSTEM_CHALLENGES_COUNT, context, systemChallengeFee);
      await expect(startChallenge(shelterer, bundleId, challenger, userChallengeFee)).to.be.rejected;
      await setNumberOfStakers(13);
      await expect(startChallenge(shelterer, bundleId, challenger, userChallengeFee)).to.be.fulfilled;
    });

    describe('Stores challenge correctly', () => {
      let challengeBlockTimestamp;
      let challengeCreationEvent;
      let challengeId;

      beforeEach(async () => {
        await startChallenge(shelterer, bundleId, challenger, userChallengeFee);
        challengeBlockTimestamp = now;
        [challengeCreationEvent] = await challengesEventEmitter.getPastEvents('allEvents');
        ({challengeId} = challengeCreationEvent.returnValues);
      });

      it('Stores challenge id', async () => {
        expect(await getChallengeId(shelterer, bundleId)).to.equal(challengeId);
      });

      it('Shelterer id', async () => {
        expect(await getChallengedShelterer(challengeId)).to.equal(shelterer);
      });

      it('Bundle id', async () => {
        expect(await getChallengedBundle(challengeId)).to.equal(bundleId);
      });

      it('Challenger id', async () => {
        expect(await getChallenger(challengeId)).to.equal(challenger);
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
    let cooldown;

    const injectChallengeWithSequenceNumber = async (sequenceNumber) => challengesStore.methods.injectChallenge(shelterer, bundleId, challenger, 0, now, 1, sequenceNumber).send({from: context});

    const atlasOnboarding = async (address) => {
      await addToKycWhitelist(address, ATLAS, ATLAS1_STAKE);
      await onboardAsAtlas(url, address, ATLAS1_STAKE);
    };

    const lastChallengeId = async () => {
      const [challengeCreationEvent] = await challengesEventEmitter.getPastEvents('allEvents');
      return challengeCreationEvent.returnValues.challengeId;
    };

    beforeEach(async () => {
      await atlasOnboarding(resolver);
      await depositStake(shelterer, ATLAS1_STAKE);
      await addShelterer(bundleId, shelterer, totalReward);
      await startChallenge(shelterer, bundleId, challenger, userChallengeFee);
      challengeId = await lastChallengeId();
      await setNumberOfStakers(20);
      cooldown = parseInt(await getCooldown(), 10);
    });

    it('Emits proper event', async () => {
      await expectEventEmission(web3,
        () => resolveChallenge(challengeId, resolver),
        challengesEventEmitter,
        'ChallengeResolved',
        {
          sheltererId: shelterer,
          bundleId,
          resolverId: resolver
        });
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

    it('Removes challenge if active count was 1', async () => {
      await resolveChallenge(challengeId, resolver);
      expect(await challengeIsInProgress(challengeId)).to.equal(false);
    });

    it('Does not increase challenges sequence number if not a system challenge', async () => {
      await resolveChallenge(challengeId, resolver);
      expect(await getChallengeSequenceNumber(challengeId)).to.equal('0');
    });

    it('Can resolve if last resolved challenge is 0', async () => {
      await setLastChallengeResolvedSequenceNumber(resolver, 0);
      await injectChallengeWithSequenceNumber(cooldown - 1);
      expect(await canResolve(resolver, challengeId)).to.be.true;
      await expect(resolveChallenge(challengeId, resolver)).to.be.eventually.fulfilled;
    });

    it('Can resolve if difference between last resolved challenge sequence number and the new one is equal to cooldown or greater', async () => {
      await setLastChallengeResolvedSequenceNumber(resolver, 1);
      await injectChallengeWithSequenceNumber(cooldown + 1);
      expect(await canResolve(resolver, challengeId)).to.be.true;
      await expect(resolveChallenge(challengeId, resolver)).to.be.eventually.fulfilled;
    });

    it('Can resolve ignoring resolver cooldown if challenge is older than cooldown timeout', async () => {
      const cooldownTimeout = await getCooldownTimeout();
      await setLastChallengeResolvedSequenceNumber(resolver, 1);
      await injectChallengeWithSequenceNumber(cooldown);
      expect(await canResolve(resolver, challengeId)).to.be.false;

      await setTimestamp(now + cooldownTimeout);
      expect(await canResolve(resolver, challengeId)).to.be.true;
      await expect(resolveChallenge(challengeId, resolver)).to.be.eventually.fulfilled;
    });

    it('Fails to resolve if resolver is on cooldown', async () => {
      await setLastChallengeResolvedSequenceNumber(resolver, 1);
      await injectChallengeWithSequenceNumber(cooldown);
      expect(await canResolve(resolver, challengeId)).to.be.false;
      await expect(resolveChallenge(challengeId, resolver)).to.be.eventually.rejected;
    });

    it('Fails if challenge does not exist', async () => {
      const fakeChallengeId = utils.keccak256('fakeChallengeId');
      expect(await canResolve(resolver, fakeChallengeId)).to.equal(false);
      await expect(resolveChallenge(fakeChallengeId, resolver)).to.be.eventually.rejected;
    });

    it('Fails if resolver is already sheltering challenged bundle', async () => {
      await addSheltererToBundle(bundleId, resolver, shelteringReward, 0, now);
      expect(await canResolve(resolver, challengeId)).to.equal(false);
      await expect(resolveChallenge(challengeId, resolver)).to.be.eventually.rejected;
    });

    it('Fails to resolve if resolver has no stake', async () => {
      await setStake(resolver, '0');
      await expect(resolveChallenge(challengeId, resolver)).to.be.rejected;
    });

    it('Decreases active count', async () => {
      const systemFee = userChallengeFee.mul(new BN('3'));
      await startChallengeForSystem(uploader, bundleId, 3, context, systemFee);
      challengeId = await lastChallengeId();
      await resolveChallenge(challengeId, resolver);
      expect(await getActiveChallengesCount(challengeId)).to.equal('2');
    });

    it('Increases sequence number for all resolutions but last', async () => {
      await atlasOnboarding(totalStranger);
      const systemFee = userChallengeFee.mul(new BN('2'));
      await startChallengeForSystem(uploader, bundleId, 2, context, systemFee);
      challengeId = await lastChallengeId();
      expect(await getChallengeSequenceNumber(challengeId)).to.equal('2');
      await resolveChallenge(challengeId, resolver);
      expect(await getChallengeSequenceNumber(challengeId)).to.equal('3');
      await resolveChallenge(challengeId, totalStranger);
      expect(await getChallengeSequenceNumber(challengeId)).to.equal('0');
    });

    it('Removes system challenge if active count was 1', async () => {
      await startChallengeForSystem(uploader, bundleId, 1, context, userChallengeFee);
      challengeId = await lastChallengeId();
      await resolveChallenge(challengeId, resolver);
      expect(await challengeIsInProgress(challengeId)).to.equal(false);
    });
  });

  describe('Marking challenge as expired', () => {
    const challengeTimeout = 3 * DAY;

    beforeEach(async () => {
      await depositStake(shelterer, ATLAS1_STAKE);
      await addShelterer(bundleId, shelterer, userChallengeFee);

      await startChallenge(shelterer, bundleId, challenger, userChallengeFee);
    });

    it('Emits proper event', async () => {
      await setTimestamp(now + challengeTimeout + 1);
      await expectEventEmission(
        web3,
        () => markChallengeAsExpired(challengeId, challenger),
        challengesEventEmitter,
        'ChallengeTimeout',
        {
          sheltererId: shelterer,
          bundleId
        });
    });

    it(`Fails if challenge does not exist`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      const fakeChallengeId = utils.keccak256('fakeChallengeId');
      await expect(markChallengeAsExpired(fakeChallengeId, challenger)).to.be.eventually.rejected;
    });

    it(`Fails if challenge has already been marked as expired`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      await expect(markChallengeAsExpired(challengeId, challenger)).to.be.fulfilled;
      await expect(markChallengeAsExpired(challengeId, challenger)).to.be.eventually.rejected;
    });

    it(`Fails if challenge has not timed out yet`, async () => {
      await expect(markChallengeAsExpired(challengeId, challenger)).to.be.eventually.rejected;
    });

    it(`Can be called by anyone`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      await expect(markChallengeAsExpired(challengeId, totalStranger)).to.be.fulfilled;
    });

    it(`Penalized shelterer stops being a shelterer`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      await markChallengeAsExpired(challengeId, challenger);
      expect(await isSheltering(bundleId, resolver)).to.equal(false);
    });

    it(`Transfer funds to challenger`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      const stakeBefore = new BN(await getStake(shelterer));
      const balanceBefore = new BN(await web3.eth.getBalance(challenger));
      await markChallengeAsExpired(challengeId, challenger);
      const balanceAfter = new BN(await web3.eth.getBalance(challenger));
      const stakeAfter = new BN(await getStake(shelterer));
      expect(balanceAfter.sub(balanceBefore).toString()).to
        .equal((userChallengeFee.mul(new BN(2)).add(stakeBefore.sub(stakeAfter)))
          .toString());
    });

    it(`Deletes challenge with active count equal 1`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      expect(await challengeIsInProgress(challengeId)).to.equal(true);
      await markChallengeAsExpired(challengeId, challenger);
      expect(await challengeIsInProgress(challengeId)).to.equal(false);
    });

    it('Challenge can be marked as expired even after the shelterer has lost all of the stake', async () => {
      await setStake(uploader, 0);
      await setTimestamp(now + challengeTimeout + 1);
      expect(await getStake(uploader)).to.equal('0');
      await expect(markChallengeAsExpired(challengeId, challenger)).to.be.fulfilled;
      expect(await isSheltering(bundleId, resolver)).to.equal(false);
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
      await startChallengeForSystem(uploader, bundleId, 5, context, systemFee);
      [systemChallengeCreationEvent] = await challengesEventEmitter.getPastEvents('allEvents');
      systemChallengeId = systemChallengeCreationEvent.returnValues.challengeId;
    });

    it(`Returns fee to creator (full fee if no one resolved)`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      expect((await observeBalanceChange(web3, uploader, () => markChallengeAsExpired(systemChallengeId, totalStranger))).toString())
        .to.equal(systemFee.toString());
    });

    it(`Returns fee to creator (part of the fee if partially resolved)`, async () => {
      await addToKycWhitelist(resolver, ATLAS, ATLAS1_STAKE);
      await onboardAsAtlas(url, resolver, ATLAS1_STAKE);
      await resolveChallenge(systemChallengeId, resolver);

      await setTimestamp(now + challengeTimeout + 1);
      expect((await observeBalanceChange(web3, uploader, () => markChallengeAsExpired(systemChallengeId, totalStranger))).toString())
        .to.equal(systemFee.sub(userChallengeFee).toString());
    });

    it(`Deletes challenge with active count bigger than 1`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      expect(await getActiveChallengesCount(systemChallengeId)).to.equal('5');
      await markChallengeAsExpired(systemChallengeId, totalStranger);
      expect(await challengeIsInProgress(systemChallengeId)).to.equal(false);
    });
  });

  describe('Calculating cooldown', () => {
    it('returns 0 if there are less then 4 atlas nodes', async () => {
      await setNumberOfStakers(2);
      expect(await getCooldown()).to.equal('0');
    });

    it('returns the number of atlas nodes minus 4 if less then 50', async () => {
      await setNumberOfStakers(20);
      expect(await getCooldown()).to.equal('16');
    });

    it('returns 90% of the number of atlas nodes (floor) plus 1 if more then 50', async () => {
      await setNumberOfStakers(51);
      expect(await getCooldown()).to.equal('46');
      await setNumberOfStakers(60);
      expect(await getCooldown()).to.equal('55');
      await setNumberOfStakers(100);
      expect(await getCooldown()).to.equal('91');
    });
  });
});
