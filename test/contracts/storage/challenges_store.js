/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createWeb3, makeSnapshot, restoreSnapshot, utils} from '../../../src/utils/web3_tools';
import deploy from '../../helpers/deploy';

chai.use(chaiAsPromised);
const {expect} = chai;

describe('ChallengesStoreContract', () => {
  let challengesStore;
  let web3;
  let snapshotId;
  let deployer;
  let otherAddress;
  let exampleChallengeId;
  let shelterer;
  let challenger;
  const exampleBundleId = utils.keccak256('someBundleId');
  const feePerChallenge = '130000';
  const creationTime = '1500000000';
  const activeCount = '6';
  const sequenceNumber = '2';

  const store = (sender = deployer) =>
    challengesStore.methods.store(shelterer, exampleBundleId, challenger, feePerChallenge, creationTime, activeCount,
      sequenceNumber).send({from: sender});
  const remove = (challengeId, sender = deployer) =>
    challengesStore.methods.remove(challengeId).send({from: sender});
  const increaseSequenceNumber = (challengeId, sender = deployer) =>
    challengesStore.methods.increaseSequenceNumber(challengeId).send({from: sender});
  const decreaseActiveCount = (challengeId, sender = deployer) =>
    challengesStore.methods.decreaseActiveCount(challengeId).send({from: sender});
  const getChallenge = (challengeId) =>
    challengesStore.methods.getChallenge(challengeId).call();
  const getChallengeId = (sheltererId, bundleId) =>
    challengesStore.methods.getChallengeId(sheltererId, bundleId).call();
  const getNextChallengeSequenceNumber = () => challengesStore.methods.getNextChallengeSequenceNumber().call();
  const incrementNextChallengeSequenceNumber = (amount, sender = deployer) => challengesStore.methods.incrementNextChallengeSequenceNumber(amount).send({from: sender});

  before(async () => {
    web3 = await createWeb3();
    [deployer, shelterer, challenger, otherAddress] = await web3.eth.getAccounts();
    ({challengesStore} = await deploy({
      web3,
      sender: deployer,
      contracts: {
        challengesStore: true
      }
    }));
    exampleChallengeId = await getChallengeId(shelterer, exampleBundleId);
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('store', () => {
    it('stores challenge', async () => {
      await store();
      const storedChallenge = await getChallenge(exampleChallengeId);
      expect(storedChallenge[0]).to.equal(shelterer);
      expect(storedChallenge[1]).to.equal(exampleBundleId);
      expect(storedChallenge[2]).to.equal(challenger);
      expect(storedChallenge[3]).to.equal(feePerChallenge);
      expect(storedChallenge[4]).to.equal(creationTime);
      expect(storedChallenge[5]).to.equal(activeCount);
      expect(storedChallenge[6]).to.equal(sequenceNumber);
    });

    it('should return stored challenge id', async () => {
      expect(
        await challengesStore.methods.store(shelterer, exampleBundleId, challenger, feePerChallenge, creationTime,
          activeCount, sequenceNumber).call()
      ).to.equal(exampleChallengeId);
    });

    it('should be context internal', async () => {
      await expect(store(otherAddress)).to.be.rejected;
    });
  });

  describe('remove', () => {
    beforeEach(async () => {
      await store();
    });

    it('removes a challenge', async () => {
      await remove(exampleChallengeId);
      const removedChallenge = await getChallenge(exampleChallengeId);
      expect(removedChallenge[0]).to.equal('0x0000000000000000000000000000000000000000');
      expect(removedChallenge[1]).to.equal('0x0000000000000000000000000000000000000000000000000000000000000000');
      expect(removedChallenge[2]).to.equal('0x0000000000000000000000000000000000000000');
      expect(removedChallenge[3]).to.equal('0');
      expect(removedChallenge[4]).to.equal('0');
      expect(removedChallenge[5]).to.equal('0');
      expect(removedChallenge[6]).to.equal('0');
    });

    it('should be context internal', async () => {
      await expect(remove(exampleChallengeId, otherAddress)).to.be.rejected;
    });
  });

  describe('increaseChallengeSequenceNumber', () => {
    beforeEach(async () => {
      await store();
    });

    it('should increase sequence number', async () => {
      await increaseSequenceNumber(exampleChallengeId);
      const storedChallenge = await getChallenge(exampleChallengeId);
      expect(storedChallenge[6]).to.equal('3');
    });

    it('should be context internal', async () => {
      await expect(increaseSequenceNumber(exampleChallengeId, otherAddress)).to.be.rejected;
    });
  });

  describe('decreaseActiveCount', () => {
    beforeEach(async () => {
      await store();
    });

    it('should decrease active count', async () => {
      await decreaseActiveCount(exampleChallengeId);
      const storedChallenge = await getChallenge(exampleChallengeId);
      expect(storedChallenge[5]).to.equal('5');
    });

    it('should be context internal', async () => {
      await expect(decreaseActiveCount(exampleChallengeId, otherAddress)).to.be.rejected;
    });
  });

  describe('Next sequence number', () => {
    it('has a value of 1 just after creation', async () => {
      expect(await getNextChallengeSequenceNumber()).to.equal('1');
    });

    describe('incrementing', () => {
      it('can be used to change it', async () => {
        expect(await getNextChallengeSequenceNumber()).to.equal('1');
        await expect(incrementNextChallengeSequenceNumber(4)).to.eventually.be.fulfilled;
        expect(await getNextChallengeSequenceNumber()).to.equal('5');
      });

      it('is context internal', async () => {
        await expect(incrementNextChallengeSequenceNumber(4, otherAddress)).to.eventually.be.rejected;
      });
    });
  });
});
