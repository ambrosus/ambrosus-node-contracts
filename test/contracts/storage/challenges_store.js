/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createWeb3, makeSnapshot, restoreSnapshot, utils} from '../../../src/utils/web3_tools';
import deploy from '../../helpers/deploy';
import observeBalanceChange from '../../helpers/web3BalanceObserver';
import BN from 'bn.js';

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
  const initialSequenceNumber = '1';
  const initialSequenceNumberSummedWithActiveCount = '7';

  const store = (sender = deployer) =>
    challengesStore.methods.store(shelterer, exampleBundleId, challenger, feePerChallenge, creationTime, activeCount).send({from: sender, value: feePerChallenge});
  const remove = (challengeId, sender = deployer) =>
    challengesStore.methods.remove(challengeId).send({from: sender});
  const transferFee = (refundAddress, amountToReturn, sender = deployer) =>
    challengesStore.methods.transferFee(refundAddress, amountToReturn).send({from: sender});
  const decreaseActiveCount = (challengeId, sender = deployer) =>
    challengesStore.methods.decreaseActiveCount(challengeId).send({from: sender});
  const getChallenge = (challengeId) =>
    challengesStore.methods.getChallenge(challengeId).call();
  const getChallengeId = (sheltererId, bundleId) =>
    challengesStore.methods.getChallengeId(sheltererId, bundleId).call();
  const getNextChallengeSequenceNumber = () => challengesStore.methods.getNextChallengeSequenceNumber().call();
  const getActiveChallengesOnBundleCount = (bundleId) => challengesStore.methods.getActiveChallengesOnBundleCount(bundleId).call();

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
      expect(await observeBalanceChange(web3, challengesStore.options.address, () => store())).to.deep.equal(new BN(feePerChallenge));
      const storedChallenge = await getChallenge(exampleChallengeId);
      expect(storedChallenge[0]).to.equal(shelterer);
      expect(storedChallenge[1]).to.equal(exampleBundleId);
      expect(storedChallenge[2]).to.equal(challenger);
      expect(storedChallenge[3]).to.equal(feePerChallenge);
      expect(storedChallenge[4]).to.equal(creationTime);
      expect(storedChallenge[5]).to.equal(activeCount);
      expect(storedChallenge[6]).to.equal(initialSequenceNumber);
    });

    it('should return stored challenge id', async () => {
      expect(
        await challengesStore.methods.store(shelterer, exampleBundleId, challenger, feePerChallenge, creationTime,
          activeCount).call()
      ).to.equal(exampleChallengeId);
    });

    it('should increase active challenges count for the bundle by activeCount', async () => {
      expect(await getActiveChallengesOnBundleCount(exampleBundleId)).to.equal('0');
      await store();
      expect(await getActiveChallengesOnBundleCount(exampleBundleId)).to.equal(activeCount);
      await challengesStore.methods.store(otherAddress, exampleBundleId, challenger, feePerChallenge, creationTime,
        '4').send({from: deployer});
      expect(await getActiveChallengesOnBundleCount(exampleBundleId)).to.equal('10');
    });

    it('should increment nextChallengeSequenceNumber', async () => {
      expect(await getNextChallengeSequenceNumber()).to.equal(initialSequenceNumber);
      await store();
      expect(await getNextChallengeSequenceNumber()).to.equal(initialSequenceNumberSummedWithActiveCount);
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

    it('should decrease active challenges count for the bundle by its activeCount', async () => {
      expect(await getActiveChallengesOnBundleCount(exampleBundleId)).to.equal(activeCount);
      await remove(exampleChallengeId);
      expect(await getActiveChallengesOnBundleCount(exampleBundleId)).to.equal('0');
    });

    it('should be context internal', async () => {
      await expect(remove(exampleChallengeId, otherAddress)).to.be.rejected;
    });
  });

  describe('transferFee', () => {
    const amountToReturn = '42';
    beforeEach(async () => {
      await store();
    });

    it('transfers provided value to the refund address', async () => {
      expect((await observeBalanceChange(web3, challenger, () => transferFee(challenger, amountToReturn))).toString()).to.deep.equal(amountToReturn);
    });

    it('should be context internal', async () => {
      await expect(transferFee(challenger, amountToReturn, otherAddress)).to.be.rejected;
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

    it('should increase challenge sequence number', async () => {
      await decreaseActiveCount(exampleChallengeId);
      const storedChallenge = await getChallenge(exampleChallengeId);
      expect(storedChallenge[6]).to.equal('2');
    });

    it('should decrease active challenges count for the bundle by 1', async () => {
      await decreaseActiveCount(exampleChallengeId);
      expect(await getActiveChallengesOnBundleCount(exampleBundleId)).to.equal('5');
    });

    it('should be context internal', async () => {
      await expect(decreaseActiveCount(exampleChallengeId, otherAddress)).to.be.rejected;
    });
  });

  describe('Next sequence number', () => {
    it('has a value of 1 just after creation', async () => {
      expect(await getNextChallengeSequenceNumber()).to.equal('1');
    });
  });
});
