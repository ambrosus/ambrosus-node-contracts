/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/* eslint-disable new-cap */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import chaiEmitEvents from '../../helpers/chaiEmitEvents';
import deploy from '../../helpers/deploy';
import {ATLAS, ATLAS1_STAKE, ATLAS1_STORAGE_LIMIT, HERMES} from '../../../src/constants';
import {DAY, ONE, SYSTEM_CHALLENGES_COUNT} from '../../helpers/consts';
import {createWeb3, makeSnapshot, restoreSnapshot, utils} from '../../../src/utils/web3_tools';
import BN from 'bn.js';
import TimeMockJson from '../../../src/contracts/TimeMock.json';

export const COINBASE = '0x0000000000000000000000000000000000000000';
export const BLOCK_REWARD = utils.toWei(new BN(3));

chai.use(chaiEmitEvents);

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;
const bundleId = utils.keccak256('bundleId');

describe('Upload Contract', () => {
  let web3;
  let uploads;
  let challenges;
  let rolesStore;
  let atlasStakeStore;
  let bundleStore;
  let sheltering;
  let fees;
  let fee;
  let time;
  let atlas;
  let otherAtlas;
  let otherHermes;
  let hermes;
  let snapshotId;
  const now = 1500000000;

  const triggerSystemChallenges = (bundleId, sender, fee) => uploads.methods.triggerSystemChallenges(bundleId).send({from: sender, gasPrice: '0', value: fee});

  const expectedMinersFee = () => fee.mul(new BN(3)).div(new BN(10));
  const setTimestamp = async (timestamp) => time.methods.setCurrentTimestamp(timestamp).send({from: hermes});
  const markChallengeAsExpired = async (challengeId, marker) => challenges.methods.markAsExpired(challengeId).send({from: marker, gasPrice: '0'});
  const getChallengeId = async (sheltererId, bundleId) => challenges.methods.getChallengeId(sheltererId, bundleId).call();
  const challengeIsInProgress = async (challengeId) => challenges.methods.challengeIsInProgress(challengeId).call();
  const depositStake = async (stakerId, storageLimit, stakeValue) => atlasStakeStore.methods.depositStake(stakerId, storageLimit).send({from: hermes, value: stakeValue});
  const addShelterer = async (bundleId, sheltererId, shelteringReward) => sheltering.methods.addShelterer(bundleId, sheltererId).send({from: hermes, value: shelteringReward});

  before(async () => {
    web3 = await createWeb3();
    ({uploads, fees, challenges, bundleStore, rolesStore, time, sheltering, atlasStakeStore} = await deploy({
      web3,
      contracts: {
        rolesStore: true,
        challenges: true,
        challengesStore: true,
        uploads: true,
        sheltering: true,
        time: TimeMockJson,
        fees: true,
        config: true,
        bundleStore: true,
        atlasStakeStore: true,
        payouts: true,
        payoutsStore: true
      }
    }));
    [hermes, atlas, otherAtlas, otherHermes] = await web3.eth.getAccounts();
    fee = new BN(await fees.methods.getFeeForUpload(1).call());
    await rolesStore.methods.setRole(hermes, HERMES).send({from: hermes});
    await rolesStore.methods.setRole(atlas, ATLAS).send({from: hermes});
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('Register bundle', () => {
    it('emits event on upload', async () => {
      expect(await uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value: fee}))
        .to.emitEvent('BundleUploaded')
        .withArgs({bundleId, storagePeriods: '1'});
    });

    it(`saves as uploader`, async () => {
      const emptyAddress = '0x0000000000000000000000000000000000000000';
      expect(await bundleStore.methods.getUploader(bundleId).call({from: hermes})).to.equal(emptyAddress);
      await uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value: fee});
      expect(await bundleStore.methods.getUploader(bundleId).call({from: hermes})).to.equal(hermes);
    });

    it(`fails if fee too high`, async () => {
      const value = fee.add(new BN(1));
      await expect(uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value}))
        .to.be.eventually.rejected;
    });

    it(`fails if fee to low`, async () => {
      const value = fee.sub(new BN(1));
      await expect(uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value}))
        .to.be.eventually.rejected;
    });

    it(`fails if sender is not a Hermes`, async () => {
      await expect(uploads.methods.registerBundle(bundleId, 1).send({from: atlas, value: fee}))
        .to.be.eventually.rejected;
      await expect(uploads.methods.registerBundle(bundleId, 1).send({from: otherAtlas, value: fee}))
        .to.be.eventually.rejected;
    });

    it(`fails if already uploaded (with the same endTime)`, async () => {
      await uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value: fee});
      const promise = uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value: fee});
      await expect(promise).to.be.eventually.rejected;
    });

    it(`fails if already uploaded (with different endTime)`, async () => {
      await uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value: fee});
      const promise = uploads.methods.registerBundle(bundleId, 2).send({from: hermes, value: fee});
      await expect(promise).to.be.eventually.rejected;
    });

    it('Starts system challanges', async () => {
      await uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value: fee});
      const events = await challenges.getPastEvents('ChallengeCreated');
      expect(events.length).to.eq(1);
      expect(events[0].returnValues).to.deep.include({
        bundleId,
        count: SYSTEM_CHALLENGES_COUNT.toString()
      });
    });

    it('Pay fee to miner', async () => {
      const balanceBefore = new BN(await web3.eth.getBalance(COINBASE));
      await uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value: fee, gasPrice: '0'});
      const balanceAfter = new BN(await web3.eth.getBalance(COINBASE));
      const actualFee = balanceAfter.sub(balanceBefore).sub(BLOCK_REWARD);
      expect(actualFee.eq(expectedMinersFee())).to.be.true;
    });
  });

  describe('Trigger system challenges', () => {
    const challengeTimeout = 3 * DAY;
    let challengeId;
    let challengeFee;

    before(async () => {
      await setTimestamp(now);
      await uploads.methods.registerBundle(bundleId, 1).send({from: hermes, value: fee, gasPrice: '0'});
      challengeId = await getChallengeId(hermes, bundleId);
      challengeFee = new BN(await fees.methods.getFeeForChallenge(1).call()).mul(new BN(SYSTEM_CHALLENGES_COUNT));
      await setTimestamp(now + challengeTimeout + 1);
    });

    it('can trigger system challenges if no atlas has sheltered the bundle', async () => {
      await markChallengeAsExpired(challengeId, atlas);
      expect(await challengeIsInProgress(challengeId)).to.be.false;
      await triggerSystemChallenges(bundleId, hermes, challengeFee);
      expect(await challengeIsInProgress(challengeId)).to.be.true;
    });

    it('fails if system challenge is in progress', async () => {
      await expect(triggerSystemChallenges(bundleId, hermes, challengeFee)).to.be.rejected;
    });

    it('fails if the bundle is sheltered by somebody', async () => {
      await markChallengeAsExpired(challengeId, atlas);
      await depositStake(atlas, ATLAS1_STORAGE_LIMIT, ATLAS1_STAKE);
      await addShelterer(bundleId, atlas, 130000);

      await expect(triggerSystemChallenges(bundleId, hermes, challengeFee)).to.be.rejected;
    });

    it('fails if fee is too high or too low', async () => {
      await markChallengeAsExpired(challengeId, atlas);
      await expect(triggerSystemChallenges(bundleId, hermes, challengeFee.add(ONE))).to.be.rejected;
      await expect(triggerSystemChallenges(bundleId, hermes, challengeFee.sub(ONE))).to.be.rejected;
    });

    it('fails when triggered on foreign bundle', async () => {
      await markChallengeAsExpired(challengeId, atlas);
      const otherBundleId = utils.keccak256('otherBundleId');
      await rolesStore.methods.setRole(otherHermes, HERMES).send({from: hermes});
      await uploads.methods.registerBundle(otherBundleId, 1).send({from: hermes, value: fee, gasPrice: '0'});
      await expect(triggerSystemChallenges(otherBundleId, hermes, challengeFee)).to.be.rejected;
    });
  });
});
