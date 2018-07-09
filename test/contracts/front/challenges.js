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
import {ATLAS, ATLAS1_STAKE, ATLAS1_STORAGE_LIMIT, STORAGE_PERIOD_UNIT, DAY} from '../../../src/consts';
import {ONE} from '../../helpers/consts';
import deploy from '../../helpers/deploy';
import StakeStoreMockJson from '../../../build/contracts/StakeStoreMock.json';
import TimeMockJson from '../../../build/contracts/TimeMock.json';

chai.use(chaiEmitEvents());

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
  let challengeId;
  const bundleId = '0xfe478a45bbb3b0abbfcbfaf7785d2ba30e6e5adbde729c9e0e613e922c2b229a';
  let expirationDate;
  const now = 1500000000;

  const setTimestamp = async (timestamp) => time.methods.setCurrentTimestamp(timestamp).send({from});

  beforeEach(async () => {
    web3 = await createWeb3();
    [from, other, resolver, totalStranger] = await web3.eth.getAccounts();
    ({challenges, bundleStore, fees, sheltering, stakes, kycWhitelist, stakeStore, time} = await deploy({
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
        config: true
      }}));
    const storageTimestamp = now;
    expirationDate = storageTimestamp + STORAGE_PERIOD_UNIT;
    await setTimestamp(now);
    await bundleStore.methods.store(bundleId, from, 1).send({from});
    fee = new BN(await fees.methods.getFeeForChallenge(storageTimestamp, expirationDate).call());
    challengeId = await challenges.methods.getChallengeId(from, bundleId).call();
  });

  describe('Starting system challenges', () => {
    const otherBundleId = '0xaf478a45bbb3b0abbfcbfaf7785d2ba30e6e5adbde729c9e0e613e922c2b229a';
    let systemFee;

    beforeEach(async () => {
      await bundleStore.methods.store(otherBundleId, other, expirationDate).send({from});
      systemFee = fee.mul(new BN('5'));
    });

    it('startForSystem is context internal', async () => {
      await expect(challenges.methods.startForSystem(from, bundleId, 5).send({from, value: systemFee})).to.be.eventually.fulfilled;
      await expect(challenges.methods.startForSystem(other, otherBundleId, 5).send({from: other, value: systemFee})).to.be.eventually.rejected;
    });

    it('Should emit event', async () => {
      expect(await challenges.methods.startForSystem(from, bundleId, 5).send({from, value: systemFee})).to.emitEvent('ChallengeCreated');
    });

    it('Stores challengerId as 0x0', async () => {
      await challenges.methods.startForSystem(from, bundleId, 5).send({from, value: systemFee});
      expect(await challenges.methods.getChallengeCreationTime(challengeId).call()).to.not.equal('0');
      expect(await challenges.methods.getChallenger(challengeId).call()).to.equal('0x0000000000000000000000000000000000000000');
    });

    it('Fails if bundle is not being sheltered by provided account', async () => {
      await expect(challenges.methods.startForSystem(other, bundleId, 5).send({from, value: systemFee})).to.be.eventually.rejected;
    });

    it(`Accepts fee bigger than necessary`, async () => {
      const biggerFee = systemFee.add(ONE);
      expect(await challenges.methods.startForSystem(from, bundleId, 5).send({from, value: biggerFee})).to.emitEvent('ChallengeCreated');
    });

    it(`Fails if challenger hasn't provided a fee of valid value`, async () => {
      const tooSmallFee = systemFee.sub(ONE);
      await expect(challenges.methods.startForSystem(from, bundleId, 5).send({from, value: tooSmallFee})).to.be.eventually.rejected;
    });

    it('Fails if the challenge was added after bundle has expired', async () => {
      const expirationTime = await bundleStore.methods.getExpirationDate(bundleId).call();
      await setTimestamp(expirationTime + 1);
      await expect(challenges.methods.startForSystem(from, bundleId, 5).send({from, value: systemFee})).to.be.eventually.rejected;
    });

    it('Fails if added same challenge twice', async () => {
      expect(await challenges.methods.startForSystem(from, bundleId, 5).send({from, value: systemFee})).to.emitEvent('ChallengeCreated');
      await expect(challenges.methods.startForSystem(from, bundleId, 5).send({from, value: systemFee})).to.be.eventually.rejected;
    });
  });

  describe('Starting user challenge', () => {
    it('Challenge is not in progress until started', async () => {
      expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(false);
    });

    it('Creates a challenge and emits an event', async () => {
      expect(await challenges.methods.start(from, bundleId).send({from: other, value: fee})).to.emitEvent('ChallengeCreated');
    });

    it('Fails if bundle is not being sheltered by provided account', async () => {
      await expect(challenges.methods.start(other, bundleId).send({from, value: fee})).to.be.eventually.rejected;
      expect(await challenges.methods.start(from, bundleId).send({from: other, value: fee})).to.emitEvent('ChallengeCreated');
    });

    it(`Accepts fee bigger than necessary`, async () => {
      const biggerFee = fee.add(ONE);
      expect(await challenges.methods.start(from, bundleId).send({from: other, value: biggerFee})).to.emitEvent('ChallengeCreated');
    });

    it(`Fails if challenger hasn't provided a fee of valid value`, async () => {
      const tooSmallFee = fee.sub(ONE);
      await expect(challenges.methods.start(from, bundleId).send({from: other, value: tooSmallFee})).to.be.eventually.rejected;
    });

    it('Fails if the challenge was added after bundle has expired', async () => {
      const expirationTime = await bundleStore.methods.getExpirationDate(bundleId).call();
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
      await kycWhitelist.methods.add(resolver).send({from});
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

      it('Transfers reward', async () => {
        const resolverBalanceBeforeResolve = new BN(await web3.eth.getBalance(resolver));
        await challenges.methods.resolve(challengeId).send({from: resolver, gasPrice: '0'});
        const resolverBalanceAfterResolve = new BN(await web3.eth.getBalance(resolver));
        const resolverBalanceGain = resolverBalanceAfterResolve.sub(resolverBalanceBeforeResolve);
        expect(resolverBalanceGain.toString()).to.deep.equal(fee.toString());
      });

      it('Emits an event', async () => {
        expect(await challenges.methods.resolve(challengeId).send({from: resolver, gasPrice: '0'})).to.emitEvent('ChallengeResolved');
      });

      it('Removes challenge if active count was 1', async () => {
        await challenges.methods.resolve(challengeId).send({from: resolver});
        expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(false);
      });
    });

    it('Fails if challenge does not exist', async () => {
      const fakeChallengeId = '0xada7718d1b5db49bb9c1995152cc28ee664d4268f7de46768cf97c49ef85c9ad';
      await expect(challenges.methods.resolve(fakeChallengeId).send({from: resolver})).to.be.eventually.rejected;
    });

    it('Fails if resolver is already sheltering challenged bundle', async () => {
      await challenges.methods.start(from, bundleId).send({from: other, value: fee});
      const [challengeCreationEvent] = await challenges.getPastEvents('allEvents');
      ({challengeId} = challengeCreationEvent.returnValues);
      await bundleStore.methods.addShelterer(bundleId, resolver).send({from});
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
    });
  
    it(`Fails if challenge does not exist`, async () => {
      const fakeChallengeId = '0xada7718d1b5db49bb9c1995152cc28ee664d4268f7de46768cf97c49ef85c9ad';
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
      expect(await challenges.methods.markAsExpired(challengeId).send({from: other})).to.emitEvent('ChallengeTimeout');   
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

    it(`Transfer funds to challenger`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      const stakeBefore = new BN(await stakeStore.methods.getStake(from).call());
      const balanceBefore = new BN(await web3.eth.getBalance(other));
      await challenges.methods.markAsExpired(challengeId).send({from: other, gasPrice: '0'});
      const balanceAfter = new BN(await web3.eth.getBalance(other));
      const stakeAfter = new BN(await stakeStore.methods.getStake(from).call());
      expect(balanceAfter.sub(balanceBefore).toString()).to.eq(fee.add(stakeBefore.sub(stakeAfter)).toString());
    });

    it(`Deletes challenge with active count equal 1`, async () => {
      await setTimestamp(now + challengeTimeout + 1);
      expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(true);
      await challenges.methods.markAsExpired(challengeId).send({from: other});
      expect(await challenges.methods.challengeIsInProgress(challengeId).call()).to.equal(false);
    });

    it(`Deletes challenge with active count bigger than 1`, async () => {
      const otherBundleId = '0xaf478a45bbb3b0abbfcbfaf7785d2ba30e6e5adbde729c9e0e613e922c2b229a';
      const systemFee = fee.mul(new BN('5'));
      await bundleStore.methods.store(otherBundleId, other, 1).send({from});
      await challenges.methods.startForSystem(other, otherBundleId, 5).send({from, value: systemFee});
      const [systemChallengeCreationEvent] = await challenges.getPastEvents('allEvents');
      const systemChallengeId = systemChallengeCreationEvent.returnValues.challengeId;
      await setTimestamp(now + challengeTimeout + 1);
      await stakeStore.methods.depositStake(other, ATLAS1_STORAGE_LIMIT, ATLAS).send({from, value: deposit});

      expect(await challenges.methods.getActiveChallengesCount(systemChallengeId).call()).to.equal('5');
      await challenges.methods.markAsExpired(systemChallengeId).send({from: totalStranger});
      expect(await challenges.methods.challengeIsInProgress(systemChallengeId).call()).to.equal(false);
    });
  });
});
