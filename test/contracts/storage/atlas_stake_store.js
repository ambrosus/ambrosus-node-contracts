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
  let moreShelterers;
  let otherAddress;
  let atlasStakeStore;
  let snapshotId;

  const isStaking = async (sheltererId) => atlasStakeStore.methods.isStaking(sheltererId).call();
  const isShelteringAny = async (sheltererId) => atlasStakeStore.methods.isShelteringAny(sheltererId).call();
  const depositStake = async (sheltererId, stake, sender = deployer) => atlasStakeStore.methods.depositStake(sheltererId).send({from: sender, value: stake});
  const releaseStake = async (sheltererId, refundAddress, sender = deployer, options = {}) => atlasStakeStore.methods.releaseStake(sheltererId, refundAddress).send({from: sender, ...options});
  const slash = async (sheltererId, refundAddress, penalty, sender = deployer) => atlasStakeStore.methods.slash(sheltererId, refundAddress, penalty).send({from: sender});
  const getStake = async (sheltererId) => atlasStakeStore.methods.getStake(sheltererId).call();
  const getShelteredBundlesCount = async (sheltererId) => atlasStakeStore.methods.getShelteredBundlesCount(sheltererId).call();
  const getNumberOfStakers = async () => atlasStakeStore.methods.getNumberOfStakers().call();
  const getNumberOfStakersWithStake = async (amount) => atlasStakeStore.methods.getNumberOfStakersWithStake(amount).call();
  const getStakerAtIndex = async (inx) => atlasStakeStore.methods.getStakerAtIndex(inx).call();
  const getStakerWithStakeAtIndex = async (amount, inx) => atlasStakeStore.methods.getStakerWithStakeAtIndex(amount, inx).call();
  const incrementShelteredBundlesCount = async (sheltererId, sender = deployer) => atlasStakeStore.methods.incrementShelteredBundlesCount(sheltererId).send({from: sender});
  const decrementShelteredBundlesCount = async (sheltererId, sender = deployer) => atlasStakeStore.methods.decrementShelteredBundlesCount(sheltererId).send({from: sender});
  const getPenaltiesHistory = async (sheltererId) => atlasStakeStore.methods.getPenaltiesHistory(sheltererId).call();
  const setPenaltyHistory = async (sheltererId, penaltiesCount, currentTimestamp, sender = deployer) => atlasStakeStore.methods.setPenaltyHistory(sheltererId, penaltiesCount, currentTimestamp).send({from: sender});
  const updateLastChallengeResolvedSequenceNumber = async (sheltererId, sequenceNumber, sender = deployer) => atlasStakeStore.methods.updateLastChallengeResolvedSequenceNumber(sheltererId, sequenceNumber).send({from: sender});
  const getLastChallengeResolvedSequenceNumber = async (sheltererId) => atlasStakeStore.methods.getLastChallengeResolvedSequenceNumber(sheltererId).call();
  const getBalance = async (address) => web3.eth.getBalance(address);


  before(async () => {
    web3 = await createWeb3();
    [deployer, shelterer, otherAddress, ...moreShelterers] = await web3.eth.getAccounts();
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
      expect(await isShelteringAny(shelterer)).to.be.false;
      expect(await getShelteredBundlesCount(shelterer)).to.be.eq('0');
    });
  });

  describe('Deposit a stake', () => {
    const examplePenaltyCount = '5';
    const examplePenaltyTimestamp = '100000';
    const exampleChallengeSequenceNumber = '10';

    it('can not stake if already staking', async () => {
      await depositStake(shelterer, 1);
      await expect(depositStake(shelterer, 2)).to.be.eventually.rejected;
      expect(await getStake(shelterer)).to.eq('1');
    });

    it('reject if not context internal call', async () => {
      await expect(depositStake(shelterer, 1, otherAddress)).to.be.eventually.rejected;
    });

    it('initiate stake', async () => {
      await depositStake(shelterer, 2);
      expect(await isStaking(shelterer)).to.be.true;
      expect(await isShelteringAny(shelterer)).to.be.false;
      expect(await getShelteredBundlesCount(shelterer)).to.be.eq('0');
      expect(await getPenaltiesHistory(shelterer)).to.deep.include({
        lastPenaltyTime: '0',
        penaltiesCount: '0'
      });
      expect(await getBalance(atlasStakeStore.options.address)).to.eq('2');
    });

    it('depositing stake doesn’t change the penalty and cooldown data', async () => {
      await depositStake(shelterer, 2);
      await setPenaltyHistory(shelterer, examplePenaltyCount, examplePenaltyTimestamp);
      await updateLastChallengeResolvedSequenceNumber(shelterer, exampleChallengeSequenceNumber);

      await releaseStake(shelterer, otherAddress);
      await depositStake(shelterer, 2);

      const penaltiesHistory = await getPenaltiesHistory(shelterer);
      expect(penaltiesHistory.penaltiesCount).to.be.equal(examplePenaltyCount);
      expect(penaltiesHistory.lastPenaltyTime).to.be.equal(examplePenaltyTimestamp);
      expect(await getLastChallengeResolvedSequenceNumber(shelterer)).to.be.equal(exampleChallengeSequenceNumber);
    });

    it('keeps track of the number of stakers', async () => {
      expect(await getNumberOfStakers()).to.equal('0');
      expect(await getNumberOfStakersWithStake(2)).to.equal('0');
      await depositStake(shelterer, 2);
      expect(await getNumberOfStakers()).to.equal('1');
      expect(await getNumberOfStakersWithStake(2)).to.equal('1');
    });
  });

  describe('Update last challenge resolved sequence number', () => {
    it('can not update if not staking', async () => {
      await expect(updateLastChallengeResolvedSequenceNumber(1)).to.be.eventually.rejected;
    });

    it('reject if not context internal call', async () => {
      await depositStake(shelterer, 1);
      await expect(updateLastChallengeResolvedSequenceNumber(shelterer, 1, otherAddress)).to.be.eventually.rejected;
    });

    it('updates last challenge resolved sequence number', async () => {
      await depositStake(shelterer, 1);
      await expect(updateLastChallengeResolvedSequenceNumber(shelterer, 100)).to.be.eventually.fulfilled;
      expect(await getLastChallengeResolvedSequenceNumber(shelterer)).to.equal('100');
    });
  });

  describe('Increment storage used', () => {
    beforeEach(async () => {
      await depositStake(shelterer, 1);
    });

    it('properly updates contract state', async () => {
      await incrementShelteredBundlesCount(shelterer);
      expect(await isStaking(shelterer)).to.be.true;
      expect(await isShelteringAny(shelterer)).to.be.true;
      expect(await getShelteredBundlesCount(shelterer)).to.be.eq('1');
    });

    it('reject if not context internal call', async () => {
      await expect(incrementShelteredBundlesCount(shelterer, otherAddress)).to.be.eventually.rejected;
    });
  });

  describe('Decrement storage used', () => {
    beforeEach(async () => {
      await depositStake(shelterer, 1);
      await incrementShelteredBundlesCount(shelterer);
    });

    it('properly updates contract state', async () => {
      await decrementShelteredBundlesCount(shelterer);
      expect(await isStaking(shelterer)).to.be.true;
      expect(await isShelteringAny(shelterer)).to.be.false;
      expect(await getShelteredBundlesCount(shelterer)).to.be.eq('0');
    });

    it('reject if not context internal call', async () => {
      await expect(decrementShelteredBundlesCount(shelterer, otherAddress)).to.be.eventually.rejected;
    });

    it('reject if nothing is stored', async () => {
      await decrementShelteredBundlesCount(shelterer);
      await expect(decrementShelteredBundlesCount(shelterer)).to.be.eventually.rejected;
    });
  });

  describe('Release a stake', () => {
    const stake = 100;
    const examplePenaltyCount = '5';
    const examplePenaltyTimestamp = '100000';
    const exampleChallengeSequenceNumber = '10';

    beforeEach(async () => {
      await depositStake(shelterer, stake);
    });

    it('properly updates contract state', async () => {
      await releaseStake(shelterer, otherAddress);
      expect(await isStaking(shelterer)).to.be.false;
      expect(await isShelteringAny(shelterer)).to.be.false;
      expect(await getShelteredBundlesCount(shelterer)).to.be.eq('0');
      expect(await getStake(shelterer)).to.be.eq('0');
    });

    it('penalty and cooldown data is not erased', async () => {
      await setPenaltyHistory(shelterer, examplePenaltyCount, examplePenaltyTimestamp);
      await updateLastChallengeResolvedSequenceNumber(shelterer, exampleChallengeSequenceNumber);

      await releaseStake(shelterer, otherAddress);

      const penaltiesHistory = await getPenaltiesHistory(shelterer);
      expect(penaltiesHistory.penaltiesCount).to.be.equal(examplePenaltyCount);
      expect(penaltiesHistory.lastPenaltyTime).to.be.equal(examplePenaltyTimestamp);
      expect(await getLastChallengeResolvedSequenceNumber(shelterer)).to.be.equal(exampleChallengeSequenceNumber);
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
      await incrementShelteredBundlesCount(shelterer);
      await expect(releaseStake(shelterer, otherAddress)).to.be.eventually.rejected;
    });

    it('can not release a stake if the refund address equals 0x0', async () => {
      await expect(releaseStake(shelterer, '0x0000000000000000000000000000000000000000')).to.be.eventually.rejected;
    });

    it('can not release a stake if is not staking', async () => {
      await expect(releaseStake(otherAddress, otherAddress)).to.be.eventually.rejected;
    });

    it('decrement the number of stakers', async () => {
      expect(await getNumberOfStakers()).to.equal('1');
      expect(await getNumberOfStakersWithStake(stake)).to.equal('1');
      await releaseStake(shelterer, otherAddress);
      expect(await getNumberOfStakers()).to.equal('0');
      expect(await getNumberOfStakersWithStake(stake)).to.equal('0');
    });
  });

  describe('Slashing', () => {
    const stake = 100;
    const penalty = stake / 100;

    beforeEach(async () => {
      await depositStake(shelterer, stake);
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

  describe('Index', () => {
    const STAKE1 = 34;
    const STAKE2 = 1267;

    it('keeps track of the number of stakers', async () => {
      const expectCount = async (all, stake1, stake2) => {
        expect(await getNumberOfStakers()).to.equal(all);
        expect(await getNumberOfStakersWithStake(STAKE1)).to.equal(stake1);
        expect(await getNumberOfStakersWithStake(STAKE2)).to.equal(stake2);
      };

      await expectCount('0', '0', '0');
      await depositStake(shelterer, STAKE1);
      await expectCount('1', '1', '0');
      await depositStake(otherAddress, STAKE2);
      await expectCount('2', '1', '1');
      await releaseStake(shelterer, otherAddress);
      await expectCount('1', '0', '1');
      await releaseStake(otherAddress, otherAddress);
      await expectCount('0', '0', '0');
    });

    it('provides sequential access to stakers', async () => {
      await depositStake(moreShelterers[0], STAKE1);
      await depositStake(moreShelterers[1], STAKE1);
      await depositStake(moreShelterers[2], STAKE2);
      await depositStake(moreShelterers[3], STAKE1);
      await depositStake(moreShelterers[4], STAKE2);

      expect(await getStakerAtIndex(0)).to.equal(moreShelterers[0]);
      expect(await getStakerAtIndex(1)).to.equal(moreShelterers[1]);
      expect(await getStakerAtIndex(2)).to.equal(moreShelterers[2]);
      expect(await getStakerAtIndex(3)).to.equal(moreShelterers[3]);
      expect(await getStakerAtIndex(4)).to.equal(moreShelterers[4]);
    });

    it('provides sequential access to stakers with given amount', async () => {
      await depositStake(moreShelterers[0], STAKE1);
      await depositStake(moreShelterers[1], STAKE1);
      await depositStake(moreShelterers[2], STAKE2);
      await depositStake(moreShelterers[3], STAKE1);
      await depositStake(moreShelterers[4], STAKE2);

      expect(await getStakerWithStakeAtIndex(STAKE1, 0)).to.equal(moreShelterers[0]);
      expect(await getStakerWithStakeAtIndex(STAKE1, 1)).to.equal(moreShelterers[1]);
      expect(await getStakerWithStakeAtIndex(STAKE1, 2)).to.equal(moreShelterers[3]);
      expect(await getStakerWithStakeAtIndex(STAKE2, 0)).to.equal(moreShelterers[2]);
      expect(await getStakerWithStakeAtIndex(STAKE2, 1)).to.equal(moreShelterers[4]);
    });

    it('handles removals correctly', async () => {
      await depositStake(moreShelterers[0], STAKE1);
      await depositStake(moreShelterers[1], STAKE1);
      await depositStake(moreShelterers[2], STAKE2);
      await depositStake(moreShelterers[3], STAKE1);
      await depositStake(moreShelterers[4], STAKE2);
      await releaseStake(moreShelterers[1], otherAddress);
      await releaseStake(moreShelterers[4], otherAddress);

      expect(await getStakerWithStakeAtIndex(STAKE1, 0)).to.equal(moreShelterers[0]);
      expect(await getStakerWithStakeAtIndex(STAKE1, 1)).to.equal(moreShelterers[3]);
      expect(await getStakerWithStakeAtIndex(STAKE2, 0)).to.equal(moreShelterers[2]);
    });
  });
});
