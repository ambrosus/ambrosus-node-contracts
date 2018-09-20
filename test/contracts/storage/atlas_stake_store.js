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
  let shelterer;
  let otherAddress;
  let atlasStakeStore;
  let snapshotId;

  before(async () => {
    web3 = await createWeb3();
    [shelterer, otherAddress] = await web3.eth.getAccounts();
    ({atlasStakeStore} = await deploy({
      web3,
      contracts: {
        atlasStakeStore: true,
        config: true
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
      expect(await atlasStakeStore.methods.isStaking(shelterer).call()).to.be.false;
      expect(await atlasStakeStore.methods.canStore(shelterer).call()).to.be.false;
      expect(await atlasStakeStore.methods.isShelteringAny(shelterer).call()).to.be.false;
      expect(await atlasStakeStore.methods.getStorageUsed(shelterer).call()).to.be.eq('0');
    });
  });

  describe('Deposit a stake', () => {
    it('can not stake if already staking', async () => {
      await atlasStakeStore.methods.depositStake(shelterer, 1).send({from: shelterer, value: 1});
      await expect(atlasStakeStore.methods.depositStake(shelterer, 1).send({from: shelterer, value: 2})).to.be.eventually.rejected;
      await expect(await atlasStakeStore.methods.getStake(shelterer).call()).to.eq('1');
    });

    it('reject if not context internal call', async () => {
      await expect(atlasStakeStore.methods.depositStake(shelterer, 1).send({from: otherAddress, value: 1})).to.be.eventually.rejected;
    });

    it('initiate stake', async () => {
      await atlasStakeStore.methods.depositStake(shelterer, 1).send({from: shelterer, value: 2});
      expect(await atlasStakeStore.methods.isStaking(shelterer).call()).to.be.true;
      expect(await atlasStakeStore.methods.canStore(shelterer).call()).to.be.true;
      expect(await atlasStakeStore.methods.isShelteringAny(shelterer).call()).to.be.false;
      expect(await atlasStakeStore.methods.getStorageUsed(shelterer).call()).to.be.eq('0');
      expect(await atlasStakeStore.methods.getStorageLimit(shelterer).call()).to.eq('1');
      expect(await atlasStakeStore.methods.getPenaltiesHistory(shelterer).call()).to.deep.include({
        lastPenaltyTime: '0',
        penaltiesCount: '0'
      });
      expect(await web3.eth.getBalance(atlasStakeStore.options.address)).to.eq('2');
    });
  });

  describe('Update last challenge resolved sequence number', () => {
    it('can not update if not staking', async () => {
      await expect(atlasStakeStore.methods.updateLastChallengeResolvedSequenceNumber(shelterer, 1).send({from: shelterer})).to.be.eventually.rejected;
    });

    it('reject if not context internal call', async () => {
      await atlasStakeStore.methods.depositStake(shelterer, 1).send({from: shelterer, value: 1});
      await expect(atlasStakeStore.methods.updateLastChallengeResolvedSequenceNumber(shelterer, 1).send({from: otherAddress})).to.be.eventually.rejected;
    });

    it('updates last challenge resolved sequence number', async () => {
      await atlasStakeStore.methods.depositStake(shelterer, 1).send({from: shelterer, value: 1});
      await atlasStakeStore.methods.updateLastChallengeResolvedSequenceNumber(shelterer, 100).send({from: shelterer});
      expect(await atlasStakeStore.methods.getLastChallengeResolvedSequenceNumber(shelterer).call()).to.equal('100');
    });
  });

  describe('Increment storage used', () => {
    beforeEach(async () => {
      await atlasStakeStore.methods.depositStake(shelterer, 1).send({from: shelterer, value: 1});
    });

    it('properly updates contract state', async () => {
      await atlasStakeStore.methods.incrementStorageUsed(shelterer).send({from: shelterer});
      expect(await atlasStakeStore.methods.isStaking(shelterer).call()).to.be.true;
      expect(await atlasStakeStore.methods.canStore(shelterer).call()).to.be.false;
      expect(await atlasStakeStore.methods.isShelteringAny(shelterer).call()).to.be.true;
      expect(await atlasStakeStore.methods.getStorageUsed(shelterer).call()).to.be.eq('1');
    });

    it('reject if not context internal call', async () => {
      await expect(atlasStakeStore.methods.incrementStorageUsed(shelterer).send({from: otherAddress})).to.be.eventually.rejected;
    });

    it('reject if run out of limit reached', async () => {
      await atlasStakeStore.methods.incrementStorageUsed(shelterer).send({from: shelterer});
      await expect(atlasStakeStore.methods.incrementStorageUsed(shelterer).send({from: shelterer})).to.be.eventually.rejected;
    });
  });

  describe('Decrement storage used', () => {
    beforeEach(async () => {
      await atlasStakeStore.methods.depositStake(shelterer, 1).send({from: shelterer, value: 1});
      await atlasStakeStore.methods.incrementStorageUsed(shelterer).send({from: shelterer});
    });

    it('properly updates contract state', async () => {
      await atlasStakeStore.methods.decrementStorageUsed(shelterer).send({from: shelterer});
      expect(await atlasStakeStore.methods.isStaking(shelterer).call()).to.be.true;
      expect(await atlasStakeStore.methods.canStore(shelterer).call()).to.be.true;
      expect(await atlasStakeStore.methods.isShelteringAny(shelterer).call()).to.be.false;
      expect(await atlasStakeStore.methods.getStorageUsed(shelterer).call()).to.be.eq('0');
    });

    it('reject if not context internal call', async () => {
      await expect(atlasStakeStore.methods.decrementStorageUsed(shelterer).send({from: otherAddress})).to.be.eventually.rejected;
    });

    it('reject if nothing is stored', async () => {
      await atlasStakeStore.methods.decrementStorageUsed(shelterer).send({from: shelterer});
      await expect(atlasStakeStore.methods.decrementStorageUsed(shelterer).send({from: shelterer})).to.be.eventually.rejected;
    });
  });

  describe('Release a stake', () => {
    const stake = 100;

    beforeEach(async () => {
      await atlasStakeStore.methods.depositStake(shelterer, 1).send({from: shelterer, value: stake});
    });

    it('properly updates contract state', async () => {
      await atlasStakeStore.methods.releaseStake(shelterer, otherAddress).send({from: shelterer});
      expect(await atlasStakeStore.methods.isStaking(shelterer).call()).to.be.false;
      expect(await atlasStakeStore.methods.canStore(shelterer).call()).to.be.false;
      expect(await atlasStakeStore.methods.isShelteringAny(shelterer).call()).to.be.false;
      expect(await atlasStakeStore.methods.getStorageUsed(shelterer).call()).to.be.eq('0');
      expect(await atlasStakeStore.methods.getStake(shelterer).call()).to.be.eq('0');
    });

    it('release stake and send it back', async () => {
      const balanceChange = await observeBalanceChange(web3, otherAddress,
        () => atlasStakeStore.methods.releaseStake(shelterer, otherAddress).send({from: shelterer, gasPrice: '0'}));
      expect(balanceChange.toString()).to.equal(stake.toString());
    });

    it('can not release a stake if not internal call', async () => {
      expect(await atlasStakeStore.methods.getStake(shelterer).call()).to.be.eq(stake.toString());
      await expect(atlasStakeStore.methods.releaseStake(shelterer, otherAddress).send({from: otherAddress})).to.be.eventually.rejected;
    });

    it('can not release a stake if storing', async () => {
      await atlasStakeStore.methods.incrementStorageUsed(shelterer).send({from: shelterer});
      await expect(atlasStakeStore.methods.releaseStake(shelterer, otherAddress).send({from: shelterer})).to.be.eventually.rejected;
    });

    it('can not release a stake if is not staking', async () => {
      await expect(atlasStakeStore.methods.releaseStake(shelterer, otherAddress).send({other: otherAddress})).to.be.eventually.rejected;
    });
  });

  describe('Slashing', () => {
    const stake = 100;
    const penalty = stake / 100;

    beforeEach(async () => {
      await atlasStakeStore.methods.depositStake(shelterer, 10).send({from: shelterer, value: stake});
    });

    it('can not slash if not staking', async () => {
      await expect(atlasStakeStore.methods.slash(otherAddress, otherAddress, penalty).send({from: shelterer})).to.be.eventually.rejected;
    });

    it('reject slash if not context internal call', async () => {
      await expect(atlasStakeStore.methods.slash(shelterer, otherAddress, penalty).send({from: otherAddress})).to.be.eventually.rejected;
      expect(await atlasStakeStore.methods.getStake(shelterer).call()).to.equal(stake.toString());
    });

    it('slashed stake goes to receiver', async () => {
      const balanceBefore = new BN(await web3.eth.getBalance(otherAddress));
      await atlasStakeStore.methods.slash(shelterer, otherAddress, penalty).send({from: shelterer});
      const balanceAfter = new BN(await web3.eth.getBalance(otherAddress));
      const expected = balanceBefore.add(new BN(penalty));
      expect(balanceAfter.toString()).to.equal(expected.toString());
    });

    it('slashed stake is subtracted shelterer contract balance', async () => {
      await atlasStakeStore.methods.slash(shelterer, otherAddress, penalty).send({from: shelterer});
      const contractBalance = new BN(await web3.eth.getBalance(atlasStakeStore.options.address));
      expect(contractBalance.toString()).to.equal(new BN(stake - penalty).toString());
      const stakeAfterSlashing = await atlasStakeStore.methods.getStake(shelterer).call();
      expect(stakeAfterSlashing).to.equal(new BN(stake - penalty).toString());
    });

    it('slashed stake is zeroed if penalty is higher than stake', async () => {
      await atlasStakeStore.methods.slash(shelterer, otherAddress, 1000).send({from: shelterer});
      expect(await atlasStakeStore.methods.getStake(shelterer).call()).to.equal('0');
    });
  });

  describe('Set penalty history', () => {
    const penaltiesCount = '10';
    const currentTimestamp = '20';

    it('sets penalties count and last penalty timestamp', async () => {
      await atlasStakeStore.methods.setPenaltyHistory(shelterer, penaltiesCount, currentTimestamp).send({from: shelterer});
      expect((await atlasStakeStore.methods.getPenaltiesHistory(shelterer).call()).penaltiesCount).to.equal(penaltiesCount);
      expect((await atlasStakeStore.methods.getPenaltiesHistory(shelterer).call()).lastPenaltyTime).to.equal(currentTimestamp);
    });

    it('isContextInternal', async () => {
      await expect(
        atlasStakeStore.methods.setPenaltyHistory(shelterer, penaltiesCount, currentTimestamp).send({from: otherAddress})
      ).to.be.eventually.rejected;
    });
  });
});
