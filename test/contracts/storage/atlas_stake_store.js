/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import deploy from '../../helpers/deploy';
import BN from 'bn.js';
import observeBalanceChange from '../../helpers/web3BalanceObserver';
import {createWeb3, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('AtlasStakeStore Contract', () => {
  let web3;
  let deployer;
  let shelterer;
  let otherAddress;
  let atlasStakeStore;
  let snapshotId;

  const isStaking = async (sheltererId) => atlasStakeStore.methods.isStaking(sheltererId).call();
  const canStore = async (sheltererId) => atlasStakeStore.methods.canStore(sheltererId).call();
  const isShelteringAny = async (sheltererId) => atlasStakeStore.methods.isShelteringAny(sheltererId).call();
  const depositStake = async (sheltererId, storageLimit, stake, sender = deployer) => atlasStakeStore.methods.depositStake(sheltererId, storageLimit).send({from: sender, value: stake});
  const releaseStake = async (sheltererId, refundAddress, sender = deployer, options = {}) => atlasStakeStore.methods.releaseStake(sheltererId, refundAddress).send({from: sender, ...options});
  const slash = async (sheltererId, refundAddress, penalty, sender = deployer) => atlasStakeStore.methods.slash(sheltererId, refundAddress, penalty).send({from: sender});
  const getStake = async (sheltererId) => atlasStakeStore.methods.getStake(sheltererId).call();
  const getStorageLimit = async (sheltererId) => atlasStakeStore.methods.getStorageLimit(sheltererId).call();
  const getStorageUsed = async (sheltererId) => atlasStakeStore.methods.getStorageUsed(sheltererId).call();
  const getNumberOfStakers = async () => atlasStakeStore.methods.getNumberOfStakers().call();
  const incrementStorageUsed = async (sheltererId, sender = deployer) => atlasStakeStore.methods.incrementStorageUsed(sheltererId).send({from: sender});
  const decrementStorageUsed = async (sheltererId, sender = deployer) => atlasStakeStore.methods.decrementStorageUsed(sheltererId).send({from: sender});
  const getPenaltiesHistory = async (sheltererId) => atlasStakeStore.methods.getPenaltiesHistory(sheltererId).call();
  const setPenaltyHistory = async (sheltererId, penaltiesCount, currentTimestamp, sender = deployer) => atlasStakeStore.methods.setPenaltyHistory(sheltererId, penaltiesCount, currentTimestamp).send({from: sender});
  const updateLastChallengeResolvedSequenceNumber = async (sheltererId, sequenceNumber, sender = deployer) => atlasStakeStore.methods.updateLastChallengeResolvedSequenceNumber(sheltererId, sequenceNumber).send({from: sender});
  const getLastChallengeResolvedSequenceNumber = async (sheltererId) => atlasStakeStore.methods.getLastChallengeResolvedSequenceNumber(sheltererId).call();
  const getBalance = async (address) => web3.eth.getBalance(address);


  before(async () => {
    web3 = await createWeb3();
    [deployer, shelterer, otherAddress] = await web3.eth.getAccounts();
    ({atlasStakeStore} = await deploy({
      web3,
      sender: deployer,
      contracts: {
        atlasStakeStore: true
      }
    }));
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('Deployment', () => {
    it('properly initialized', async () => {
      expect(await isStaking(shelterer)).to.be.false;
      expect(await canStore(shelterer)).to.be.false;
      expect(await isShelteringAny(shelterer)).to.be.false;
      expect(await getStorageUsed(shelterer)).to.be.eq('0');
    });
  });

  describe('Deposit a stake', () => {
    it('can not stake if already staking', async () => {
      await depositStake(shelterer, 1, 1);
      await expect(depositStake(shelterer, 1, 2)).to.be.eventually.rejected;
      expect(await getStake(shelterer)).to.eq('1');
    });

    it('reject if not context internal call', async () => {
      await expect(depositStake(shelterer, 1, 1, otherAddress)).to.be.eventually.rejected;
    });

    it('initiate stake', async () => {
      await depositStake(shelterer, 1, 2);
      expect(await isStaking(shelterer)).to.be.true;
      expect(await canStore(shelterer)).to.be.true;
      expect(await isShelteringAny(shelterer)).to.be.false;
      expect(await getStorageUsed(shelterer)).to.be.eq('0');
      expect(await getStorageLimit(shelterer)).to.eq('1');
      expect(await getPenaltiesHistory(shelterer)).to.deep.include({
        lastPenaltyTime: '0',
        penaltiesCount: '0'
      });
      expect(await getBalance(atlasStakeStore.options.address)).to.eq('2');
    });

    it('increments the number of stakers', async () => {
      expect(await getNumberOfStakers()).to.equal('0');
      await depositStake(shelterer, 1, 2);
      expect(await getNumberOfStakers()).to.equal('1');
      await depositStake(otherAddress, 1, 2);
      expect(await getNumberOfStakers()).to.equal('2');
    });
  });

  describe('Update last challenge resolved sequence number', () => {
    it('can not update if not staking', async () => {
      await expect(updateLastChallengeResolvedSequenceNumber(1)).to.be.eventually.rejected;
    });

    it('reject if not context internal call', async () => {
      await depositStake(shelterer, 1, 1);
      await expect(updateLastChallengeResolvedSequenceNumber(shelterer, 1, otherAddress)).to.be.eventually.rejected;
    });

    it('updates last challenge resolved sequence number', async () => {
      await depositStake(shelterer, 1, 1);
      await expect(updateLastChallengeResolvedSequenceNumber(shelterer, 100)).to.be.eventually.fulfilled;
      expect(await getLastChallengeResolvedSequenceNumber(shelterer)).to.equal('100');
    });
  });

  describe('Increment storage used', () => {
    beforeEach(async () => {
      await depositStake(shelterer, 1, 1);
    });

    it('properly updates contract state', async () => {
      await incrementStorageUsed(shelterer);
      expect(await isStaking(shelterer)).to.be.true;
      expect(await canStore(shelterer)).to.be.false;
      expect(await isShelteringAny(shelterer)).to.be.true;
      expect(await getStorageUsed(shelterer)).to.be.eq('1');
    });

    it('reject if not context internal call', async () => {
      await expect(incrementStorageUsed(shelterer, otherAddress)).to.be.eventually.rejected;
    });

    it('reject if run out of limit reached', async () => {
      await incrementStorageUsed(shelterer);
      await expect(incrementStorageUsed(shelterer)).to.be.eventually.rejected;
    });
  });

  describe('Decrement storage used', () => {
    beforeEach(async () => {
      await depositStake(shelterer, 1, 1);
      await incrementStorageUsed(shelterer);
    });

    it('properly updates contract state', async () => {
      await decrementStorageUsed(shelterer);
      expect(await isStaking(shelterer)).to.be.true;
      expect(await canStore(shelterer)).to.be.true;
      expect(await isShelteringAny(shelterer)).to.be.false;
      expect(await getStorageUsed(shelterer)).to.be.eq('0');
    });

    it('reject if not context internal call', async () => {
      await expect(decrementStorageUsed(shelterer, otherAddress)).to.be.eventually.rejected;
    });

    it('reject if nothing is stored', async () => {
      await decrementStorageUsed(shelterer);
      await expect(decrementStorageUsed(shelterer)).to.be.eventually.rejected;
    });
  });

  describe('Release a stake', () => {
    const stake = 100;

    beforeEach(async () => {
      await depositStake(shelterer, 1, stake);
    });

    it('properly updates contract state', async () => {
      await releaseStake(shelterer, otherAddress);
      expect(await isStaking(shelterer)).to.be.false;
      expect(await canStore(shelterer)).to.be.false;
      expect(await isShelteringAny(shelterer)).to.be.false;
      expect(await getStorageUsed(shelterer)).to.be.eq('0');
      expect(await getStake(shelterer)).to.be.eq('0');
    });

    it('release stake and send it back', async () => {
      const balanceChange = await observeBalanceChange(
        web3,
        otherAddress,
        () => releaseStake(shelterer, otherAddress, deployer, {gasPrice: '0'})
      );
      expect(balanceChange.toString()).to.equal(stake.toString());
    });

    it('can not release a stake if not internal call', async () => {
      expect(await getStake(shelterer)).to.be.eq(stake.toString());
      await expect(releaseStake(shelterer, otherAddress, otherAddress)).to.be.eventually.rejected;
    });

    it('can not release a stake if storing', async () => {
      await incrementStorageUsed(shelterer);
      await expect(releaseStake(shelterer, otherAddress)).to.be.eventually.rejected;
    });

    it('can not release a stake if is not staking', async () => {
      await expect(releaseStake(otherAddress, otherAddress)).to.be.eventually.rejected;
    });

    it('decrement the number of stakers', async () => {
      expect(await getNumberOfStakers()).to.equal('1');
      await releaseStake(shelterer, otherAddress);
      expect(await getNumberOfStakers()).to.equal('0');
    });
  });

  describe('Slashing', () => {
    const stake = 100;
    const penalty = stake / 100;

    beforeEach(async () => {
      await depositStake(shelterer, 10, stake);
    });

    it('can not slash if not staking', async () => {
      await expect(slash(otherAddress, otherAddress, penalty)).to.be.eventually.rejected;
    });

    it('reject slash if not context internal call', async () => {
      await expect(slash(shelterer, otherAddress, penalty, otherAddress)).to.be.eventually.rejected;
      expect(await getStake(shelterer)).to.equal(stake.toString());
    });

    it('slashed stake goes to receiver', async () => {
      const balanceBefore = new BN(await getBalance(otherAddress));
      await slash(shelterer, otherAddress, penalty);
      const balanceAfter = new BN(await getBalance(otherAddress));
      const expected = balanceBefore.add(new BN(penalty));
      expect(balanceAfter.toString()).to.equal(expected.toString());
    });

    it('slashed stake is subtracted shelterer contract balance', async () => {
      await slash(shelterer, otherAddress, penalty);
      const contractBalance = new BN(await getBalance(atlasStakeStore.options.address));
      expect(contractBalance.toString()).to.equal(new BN(stake - penalty).toString());
      const stakeAfterSlashing = await getStake(shelterer);
      expect(stakeAfterSlashing).to.equal(new BN(stake - penalty).toString());
    });

    it('slashed stake is zeroed if penalty is higher than stake', async () => {
      await slash(shelterer, otherAddress, 1000);
      expect(await getStake(shelterer)).to.equal('0');
    });
  });

  describe('Set penalty history', () => {
    const penaltiesCount = '10';
    const currentTimestamp = '20';

    it('sets penalties count and last penalty timestamp', async () => {
      await setPenaltyHistory(shelterer, penaltiesCount, currentTimestamp);
      expect((await getPenaltiesHistory(shelterer)).penaltiesCount).to.equal(penaltiesCount);
      expect((await getPenaltiesHistory(shelterer)).lastPenaltyTime).to.equal(currentTimestamp);
    });

    it('isContextInternal', async () => {
      await expect(
        setPenaltyHistory(shelterer, penaltiesCount, currentTimestamp, otherAddress)
      ).to.be.eventually.rejected;
    });
  });
});
