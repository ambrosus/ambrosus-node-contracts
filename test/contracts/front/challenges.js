/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3, deployContract, makeSnapshot, restoreSnapshot, utils} from '../../../src/utils/web3_tools';
import chaiEmitEvents from '../../helpers/chaiEmitEvents';
import BN from 'bn.js';
import {
  ATLAS,
  ATLAS1_STAKE,
  ATLAS2_STAKE,
  ATLAS3_STAKE,
  DMP_PRECISION,
  ROUND_DURATION,
  FIRST_PHASE_DURATION,
  ATLAS1_NUMENATOR,
  ATLAS2_NUMENATOR,
  ATLAS3_NUMENATOR
} from '../../../src/constants';
import {ONE, DAY, SYSTEM_CHALLENGES_COUNT} from '../../helpers/consts';
import deploy from '../../helpers/deploy';
import AtlasStakeStoreMockJson from '../../../src/contracts/AtlasStakeStoreMock.json';
import ChallengesStoreMockJson from '../../../src/contracts/ChallengesStoreMock.json';
import TimeMockJson from '../../../src/contracts/TimeMock.json';
import observeBalanceChange from '../../helpers/web3BalanceObserver';
import {expectEventEmission} from '../../helpers/web3EventObserver';
import DMPalgorithmAdapterJson from '../../../src/contracts/DMPalgorithmAdapter.json';

chai.use(chaiEmitEvents);

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Challenges Contract', () => {
  let web3;
  let challenges;
  let challengesStore;
  let challengesEventEmitter;
  let DMPalgorithmAdapter;
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
  let atlassian = [];
  let resolver;
  let resolverType;
  let resolverIndex;
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
  const getChallengeDesignatedShelterer = async (challengeId) => challenges.methods.getChallengeDesignatedShelterer(challengeId).call();

  const setTimestamp = async (timestamp) => time.methods.setCurrentTimestamp(timestamp).send({from: context});
  const currentTimestamp = async (timestamp) => time.methods.currentTimestamp().call();
  const addToKycWhitelist = async(candidate, role, requiredDeposit) => kycWhitelist.methods.add(candidate, role, requiredDeposit).send({from: context});
  const storeBundle = async (bundleId, sheltererId, storagePeriods, currentTimestamp) => bundleStore.methods.store(bundleId, sheltererId, storagePeriods, currentTimestamp).send({from: context});
  const addSheltererToBundle = async (bundleId, sheltererId, shelteringReward, payoutPeriodsReduction, currentTimestamp) =>
    bundleStore.methods.addShelterer(bundleId, sheltererId, shelteringReward, payoutPeriodsReduction, currentTimestamp).send({from: context});
  const depositStake = async (stakerId, stakeValue) => atlasStakeStore.methods.depositStake(stakerId).send({from: context, value: stakeValue});
  const setStake = async (nodeId, stake) => atlasStakeStore.methods.setStakeAmount(nodeId, stake).send({from: context});
  const setNumberOfStakers = async (numberOfStakers) => atlasStakeStore.methods.setNumberOfStakers(numberOfStakers).send({from: context});
  const removeLastStaker = async (nodeId, amount) => atlasStakeStore.methods.removeLastStaker(nodeId, amount).send({from: context});
  const addShelterer = async (bundleId, sheltererId, shelteringReward) => sheltering.methods.addShelterer(bundleId, sheltererId).send({from: context, value: shelteringReward});
  const onboardAsAtlas = async(nodeUrl, nodeAddress, depositValue) => roles.methods.onboardAsAtlas(nodeUrl).send({from: nodeAddress, value: depositValue, gasPrice: '0'});

  const getShelteringExpirationDate = async(bundleId, sheltererId) => sheltering.methods.getShelteringExpirationDate(bundleId, sheltererId).call();
  const getFeeForChallenge = async (storagePeriods) => fees.methods.getFeeForChallenge(storagePeriods).call();
  const isSheltering = async (bundleId, sheltererId) => sheltering.methods.isSheltering(bundleId, sheltererId).call();
  const getLastChallengeResolvedSequenceNumber = async (nodeId) => atlasStakeStore.methods.getLastChallengeResolvedSequenceNumber(nodeId).call();
  const setLastChallengeResolvedSequenceNumber = async (nodeId, sequenceNumber) => atlasStakeStore.methods.updateLastChallengeResolvedSequenceNumber(nodeId, sequenceNumber).send({from: context});
  const getStake = async (nodeId) => atlasStakeStore.methods.getStake(nodeId).call();
  const nextChallengeSequenceNumber = async () => challengesStore.methods.getNextChallengeSequenceNumber().call();

  const getBaseHash = async (challengeId, sequenceNumber) => DMPalgorithmAdapter.methods.getBaseHash(challengeId, sequenceNumber).call();
  const getQualifyHash = async (challengeId, sequenceNumber, currentRound) => DMPalgorithmAdapter.methods.getQualifyHash(challengeId, sequenceNumber, currentRound).call();

  // eslint-disable-next-line new-cap

  before(async () => {
    web3 = await createWeb3();
    [context, challenger, uploader, atlassian[0], atlassian[1], atlassian[2], atlassian[3], atlassian[4], shelterer, totalStranger] = await web3.eth.getAccounts();
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
    DMPalgorithmAdapter = await deployContract(web3, DMPalgorithmAdapterJson);
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

    const atlasOnboarding = async (address, value, url) => {
      await addToKycWhitelist(address, ATLAS, value);
      await onboardAsAtlas(url, address, value);
    };

    const lastChallengeId = async () => {
      const [challengeCreationEvent] = await challengesEventEmitter.getPastEvents('allEvents');
      return challengeCreationEvent.returnValues.challengeId;
    };

    beforeEach(async () => {
      await atlasOnboarding(atlassian[0], ATLAS3_STAKE, 'url0');
      await atlasOnboarding(atlassian[1], ATLAS3_STAKE, 'url1');
      await atlasOnboarding(atlassian[2], ATLAS2_STAKE, 'url2');
      await atlasOnboarding(atlassian[3], ATLAS2_STAKE, 'url3');
      await atlasOnboarding(atlassian[4], ATLAS1_STAKE, 'url4');
      
      await depositStake(shelterer, ATLAS1_STAKE);
      await addShelterer(bundleId, shelterer, totalReward);
      
      await startChallenge(shelterer, bundleId, challenger, userChallengeFee);
      challengeId = await lastChallengeId();
      await removeLastStaker(shelterer, ATLAS1_STAKE);
      await setNumberOfStakers(5);

      resolver = await getChallengeDesignatedShelterer(challengeId);
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

    it('Fails to resolve for not designated resolvers', async () => {
      if (atlassian[0] != resolver) {
        expect(await canResolve(atlassian[0], challengeId)).to.equal(false);
        await expect(resolveChallenge(challengeId, atlassian[0])).to.be.eventually.rejected; 
      }
      if (atlassian[1] != resolver) {
        expect(await canResolve(atlassian[1], challengeId)).to.equal(false);
        await expect(resolveChallenge(challengeId, atlassian[1])).to.be.eventually.rejected; 
      }
      if (atlassian[2] != resolver) {
        expect(await canResolve(atlassian[2], challengeId)).to.equal(false);
        await expect(resolveChallenge(challengeId, atlassian[2])).to.be.eventually.rejected; 
      }
      if (atlassian[3] != resolver) {
        expect(await canResolve(atlassian[3], challengeId)).to.equal(false);
        await expect(resolveChallenge(challengeId, atlassian[3])).to.be.eventually.rejected; 
      }
      if (atlassian[4] != resolver) {
        expect(await canResolve(atlassian[4], challengeId)).to.equal(false);
        await expect(resolveChallenge(challengeId, atlassian[4])).to.be.eventually.rejected; 
      }
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
  });

  describe('Resolving system challenge', () => {
    const atlasOnboarding = async (address, value, url) => {
      await addToKycWhitelist(address, ATLAS, value);
      await onboardAsAtlas(url, address, value);
    };

    const lastChallengeId = async () => {
      const [challengeCreationEvent] = await challengesEventEmitter.getPastEvents('allEvents');
      return challengeCreationEvent.returnValues.challengeId;
    };

    beforeEach(async () => {
      await atlasOnboarding(atlassian[0], ATLAS1_STAKE, 'url0');
      await atlasOnboarding(atlassian[1], ATLAS1_STAKE, 'url1');
      await atlasOnboarding(atlassian[2], ATLAS1_STAKE, 'url2');

      await depositStake(shelterer, ATLAS1_STAKE);
      await addShelterer(bundleId, shelterer, totalReward);
      await startChallenge(shelterer, bundleId, challenger, userChallengeFee);
      await removeLastStaker(shelterer, ATLAS1_STAKE);

      await setNumberOfStakers(3);
    });

    it('Decreases active count', async () => {
      const systemFee = userChallengeFee.mul(new BN('3'));
      await startChallengeForSystem(uploader, bundleId, 3, context, systemFee);
      challengeId = await lastChallengeId();
      resolver = await getChallengeDesignatedShelterer(challengeId);
      await resolveChallenge(challengeId, resolver);
      expect(await getActiveChallengesCount(challengeId)).to.equal('2');
    });

    it('Increases sequence number for all resolutions but last', async () => {
      const systemFee = userChallengeFee.mul(new BN('2'));
      await startChallengeForSystem(uploader, bundleId, 2, context, systemFee);

      challengeId = await lastChallengeId();
      expect(await getChallengeSequenceNumber(challengeId)).to.equal('2');

      resolver = await getChallengeDesignatedShelterer(challengeId);
      await resolveChallenge(challengeId, resolver);
      expect(await getChallengeSequenceNumber(challengeId)).to.equal('3');

      resolver = await getChallengeDesignatedShelterer(challengeId);
      await resolveChallenge(challengeId, resolver);
      expect(await getChallengeSequenceNumber(challengeId)).to.equal('0');
    });

    it('Removes system challenge if active count was 1', async () => {
      await startChallengeForSystem(uploader, bundleId, 1, context, userChallengeFee);
      challengeId = await lastChallengeId();
      resolver = await getChallengeDesignatedShelterer(challengeId);
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
      await addToKycWhitelist(atlassian[0], ATLAS, ATLAS1_STAKE);
      await onboardAsAtlas(url, atlassian[0], ATLAS1_STAKE);
      resolver = await getChallengeDesignatedShelterer(systemChallengeId);
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

  describe('DMP algorithm testing', () => {
    let trueResolver;
    let chosenAtlas = [];
    let atlas1 = [];
    let atlas2 = [];
    let atlas3 = [];

    const atlassianChosen = async (challengeId, atlassianCount) => {
      const creationTime = await getChallengeCreationTime(challengeId);
      const sequenceNumber = await getChallengeSequenceNumber(challengeId);
      const currentTime = await currentTimestamp();
      const currentRound = Math.floor((currentTime - creationTime)/ROUND_DURATION);
      const DMPbaseHash = await getBaseHash(challengeId, sequenceNumber);
      const DMPindexHash = await getQualifyHash(challengeId, sequenceNumber, currentRound);
      const DMPindex = web3.utils.toBN(DMPindexHash).mod(new BN(atlassianCount)).toString();
      trueResolver = atlassian[DMPindex];
    };

    const atlassianChosenByType = async (challengeId, atlas1Count, atlas2Count, atlas3Count) => {
      const creationTime = await getChallengeCreationTime(challengeId);
      const sequenceNumber = await getChallengeSequenceNumber(challengeId);
      const currentTime = await currentTimestamp();
      const currentRound = Math.floor((currentTime - creationTime)/ROUND_DURATION);
      const DMPbaseHash = await getBaseHash(challengeId, sequenceNumber);
      const DMPindexHash = await getQualifyHash(challengeId, sequenceNumber, currentRound);

      const denominator = (atlas1Count*ATLAS1_NUMENATOR + atlas2Count*ATLAS2_NUMENATOR + atlas3Count*ATLAS3_NUMENATOR);

      const randomNumber = web3.utils.toBN(DMPbaseHash).mod(new BN(DMP_PRECISION)).toNumber();

      const atlas1WCD = Math.floor((atlas1Count * ATLAS1_NUMENATOR * DMP_PRECISION) / denominator);
      const atlas2WCD = atlas1WCD + Math.floor((atlas2Count * ATLAS2_NUMENATOR * DMP_PRECISION) / denominator);
      const atlas3WCD = atlas2WCD + Math.floor((atlas3Count * ATLAS3_NUMENATOR * DMP_PRECISION) / denominator);

      if (atlas1WCD != 0 && randomNumber <= atlas1WCD) {
        chosenAtlas = Array.from(atlas1);
      }
      else if (atlas2WCD != 0 && randomNumber <= atlas2WCD) {
        chosenAtlas = Array.from(atlas2);
      }
      else if (atlas3WCD != 0 && randomNumber <= atlas3WCD) {
        chosenAtlas = Array.from(atlas3);
      }

      const DMPindex = web3.utils.toBN(DMPindexHash).mod(new BN(chosenAtlas.length)).toString();
      trueResolver = chosenAtlas[DMPindex];
    };

    const atlasOnboarding = async (address, value, url) => {
      await addToKycWhitelist(address, ATLAS, value);
      await onboardAsAtlas(url, address, value);
    };

    const lastChallengeId = async () => {
      const [challengeCreationEvent] = await challengesEventEmitter.getPastEvents('allEvents');
      return challengeCreationEvent.returnValues.challengeId;
    };

    beforeEach(async () => {
      await depositStake(shelterer, ATLAS1_STAKE);
      await addShelterer(bundleId, shelterer, totalReward);
      
      await startChallenge(shelterer, bundleId, challenger, userChallengeFee);
      challengeId = await lastChallengeId();
      await removeLastStaker(shelterer, ATLAS1_STAKE);
    });

    it('Correct resolver is returned in the first round', async () => {
      await atlasOnboarding(atlassian[0], ATLAS3_STAKE, 'url0');
      await atlasOnboarding(atlassian[1], ATLAS3_STAKE, 'url1');
      await atlasOnboarding(atlassian[2], ATLAS2_STAKE, 'url2');
      await atlasOnboarding(atlassian[3], ATLAS2_STAKE, 'url3');
      await atlasOnboarding(atlassian[4], ATLAS1_STAKE, 'url4');
      await setNumberOfStakers(5);

      atlas1[0] = atlassian[4];
      atlas2[0] = atlassian[2];
      atlas2[1] = atlassian[3];
      atlas3[0] = atlassian[0];
      atlas3[1] = atlassian[1];

      await atlassianChosenByType(challengeId, 1, 2, 2);
      resolver = await getChallengeDesignatedShelterer(challengeId);

      expect(resolver).to.equal(trueResolver);
    });

    it('Correct resolver is returned in not the first round', async () => {
      await atlasOnboarding(atlassian[0], ATLAS3_STAKE, 'url0');
      await atlasOnboarding(atlassian[1], ATLAS3_STAKE, 'url1');
      await atlasOnboarding(atlassian[2], ATLAS2_STAKE, 'url2');
      await atlasOnboarding(atlassian[3], ATLAS2_STAKE, 'url3');
      await atlasOnboarding(atlassian[4], ATLAS1_STAKE, 'url4');
      await setNumberOfStakers(5);

      atlas1[0] = atlassian[4];
      atlas2[0] = atlassian[2];
      atlas2[1] = atlassian[3];
      atlas3[0] = atlassian[0];
      atlas3[1] = atlassian[1];

      await setTimestamp(now + ROUND_DURATION*5);

      await atlassianChosenByType(challengeId, 1, 2, 2);
      resolver = await getChallengeDesignatedShelterer(challengeId);

      expect(resolver).to.equal(trueResolver);
    });

    it('Correct resolver is returned in the second phase', async () => {
      await atlasOnboarding(atlassian[0], ATLAS3_STAKE, 'url0');
      await atlasOnboarding(atlassian[1], ATLAS3_STAKE, 'url1');
      await atlasOnboarding(atlassian[2], ATLAS2_STAKE, 'url2');
      await atlasOnboarding(atlassian[3], ATLAS2_STAKE, 'url3');
      await atlasOnboarding(atlassian[4], ATLAS1_STAKE, 'url4');
      await setNumberOfStakers(5);

      await setTimestamp(now + FIRST_PHASE_DURATION + ROUND_DURATION);
      await atlassianChosen(challengeId, 5);
      resolver = await getChallengeDesignatedShelterer(challengeId);

      expect(resolver).to.equal(trueResolver);
    });

    it('Correct resolver is returned if only one atlas type is present', async () => {
      await atlasOnboarding(atlassian[0], ATLAS2_STAKE, 'url0');
      await atlasOnboarding(atlassian[1], ATLAS2_STAKE, 'url1');
      await atlasOnboarding(atlassian[2], ATLAS2_STAKE, 'url2');
      await atlasOnboarding(atlassian[3], ATLAS2_STAKE, 'url3');
      await atlasOnboarding(atlassian[4], ATLAS2_STAKE, 'url4');
      await setNumberOfStakers(5);

      atlas2 = Array.from(atlassian);

      await setTimestamp(now + ROUND_DURATION*5);

      await atlassianChosenByType(challengeId, 0, 5, 0);
      resolver = await getChallengeDesignatedShelterer(challengeId);

      expect(resolver).to.equal(trueResolver);
    });

    it('Failed to get resolver if no resolver in the system', async () => {
        await expect(getChallengeDesignatedShelterer(challengeId)).to.be.eventually.rejected;
    });

  });
});
