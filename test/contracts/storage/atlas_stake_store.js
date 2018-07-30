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
import TimeMockJson from '../../../build/contracts/TimeMock.json';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('AtlasStakeStore Contract', () => {
  let web3;
  let from;
  let other;
  let atlasStakeStore;
  let time;
  const now = 1500000000;

  const setTimestamp = async (timestamp) => time.methods.setCurrentTimestamp(timestamp).send({from});

  beforeEach(async () => {
    ({web3, atlasStakeStore, time} = await deploy({web3, contracts: {atlasStakeStore: true, fees: true, config: true, time: TimeMockJson}}));
    [from, other] = await web3.eth.getAccounts();
    await setTimestamp(now);
  });

  const transactionCost = async (tx) => {
    const receipt = await web3.eth.getTransactionReceipt(tx.transactionHash);
    return new BN(receipt.cumulativeGasUsed);
  };

  describe('Deployment', () => {
    it('properly initialized', async () => {
      expect(await atlasStakeStore.methods.isStaking(from).call()).to.be.false;
      expect(await atlasStakeStore.methods.canStore(from).call()).to.be.false;
      expect(await atlasStakeStore.methods.isShelteringAny(from).call()).to.be.false;
      expect(await atlasStakeStore.methods.getStorageUsed(from).call()).to.be.eq('0');
    });
  });

  describe('Deposit a stake', () => {
    it('can not stake if already staking', async () => {
      await atlasStakeStore.methods.depositStake(from, 1).send({from, value: 1});
      await expect(atlasStakeStore.methods.depositStake(from, 1).send({from, value: 2})).to.be.eventually.rejected;
      await expect(await atlasStakeStore.methods.getStake(from).call()).to.eq('1');
    });

    it('reject if not context internal call', async () => {
      await expect(atlasStakeStore.methods.depositStake(from, 1).send({from: other, value: 1})).to.be.eventually.rejected;
    });

    it('initiate stake', async () => {
      await atlasStakeStore.methods.depositStake(from, 1).send({from, value: 2});
      expect(await atlasStakeStore.methods.isStaking(from).call()).to.be.true;
      expect(await atlasStakeStore.methods.canStore(from).call()).to.be.true;
      expect(await atlasStakeStore.methods.isShelteringAny(from).call()).to.be.false;
      expect(await atlasStakeStore.methods.getStorageUsed(from).call()).to.be.eq('0');
      expect(await atlasStakeStore.methods.getStorageLimit(from).call()).to.eq('1');
      expect(await atlasStakeStore.methods.getPenaltiesHistory(from).call()).to.deep.include({
        lastPenaltyTime: '0',
        penaltiesCount: '0'
      });
      expect(await web3.eth.getBalance(atlasStakeStore.options.address)).to.eq('2');
    });
  });

  describe('Increment storage used', () => {
    beforeEach(async () => {
      await atlasStakeStore.methods.depositStake(from, 1).send({from, value: 1});
    });

    it('properly updates contract state', async () => {
      await atlasStakeStore.methods.incrementStorageUsed(from).send({from});
      expect(await atlasStakeStore.methods.isStaking(from).call()).to.be.true;
      expect(await atlasStakeStore.methods.canStore(from).call()).to.be.false;
      expect(await atlasStakeStore.methods.isShelteringAny(from).call()).to.be.true;
      expect(await atlasStakeStore.methods.getStorageUsed(from).call()).to.be.eq('1');
    });

    it('reject if not context internal call', async () => {
      await expect(atlasStakeStore.methods.incrementStorageUsed(from).send({from: other})).to.be.eventually.rejected;
    });

    it('reject if run out of limit reached', async () => {
      await atlasStakeStore.methods.incrementStorageUsed(from).send({from});
      await expect(atlasStakeStore.methods.incrementStorageUsed(from).send({from})).to.be.eventually.rejected;
    });
  });

  describe('Decrement storage used', () => {
    beforeEach(async () => {
      await atlasStakeStore.methods.depositStake(from, 1).send({from, value: 1});
      await atlasStakeStore.methods.incrementStorageUsed(from).send({from});
    });

    it('properly updates contract state', async () => {
      await atlasStakeStore.methods.decrementStorageUsed(from).send({from});
      expect(await atlasStakeStore.methods.isStaking(from).call()).to.be.true;
      expect(await atlasStakeStore.methods.canStore(from).call()).to.be.true;
      expect(await atlasStakeStore.methods.isShelteringAny(from).call()).to.be.false;
      expect(await atlasStakeStore.methods.getStorageUsed(from).call()).to.be.eq('0');
    });

    it('reject if not context internal call', async () => {
      await expect(atlasStakeStore.methods.decrementStorageUsed(from).send({from: other})).to.be.eventually.rejected;
    });

    it('reject if nothing is stored', async () => {
      await atlasStakeStore.methods.decrementStorageUsed(from).send({from});
      await expect(atlasStakeStore.methods.decrementStorageUsed(from).send({from})).to.be.eventually.rejected;
    });
  });

  describe('Release a stake', () => {
    beforeEach(async () => {
      await atlasStakeStore.methods.depositStake(from, 1).send({from, value: 1});
    });

    it('properly updates contract state', async () => {
      await atlasStakeStore.methods.releaseStake(from).send({from, gasPrice: 1});
      expect(await atlasStakeStore.methods.isStaking(from).call()).to.be.false;
      expect(await atlasStakeStore.methods.canStore(from).call()).to.be.false;
      expect(await atlasStakeStore.methods.isShelteringAny(from).call()).to.be.false;
      expect(await atlasStakeStore.methods.getStorageUsed(from).call()).to.be.eq('0');
      expect(await atlasStakeStore.methods.getStake(from).call()).to.be.eq('0');
    });

    it('release stake and send it back', async () => {
      const balanceBefore = new BN(await web3.eth.getBalance(from));
      const tx = await atlasStakeStore.methods.releaseStake(from).send({from, gasPrice: 1});
      const balanceAfter = new BN(await web3.eth.getBalance(from));
      const expected = balanceBefore.add(new BN('1').sub(await transactionCost(tx)));
      expect(balanceAfter.eq(expected)).to.be.true;
    });

    it('can not release a stake if not internal call', async () => {
      expect(await atlasStakeStore.methods.getStake(from).call()).to.be.eq('1');
      await expect(atlasStakeStore.methods.releaseStake(from).send({from: other})).to.be.eventually.rejected;
    });

    it('can not release a stake if storing', async () => {
      await atlasStakeStore.methods.incrementStorageUsed(from).send({from});
      await expect(atlasStakeStore.methods.releaseStake(from).send({from})).to.be.eventually.rejected;
    });

    it('can not release a stake if is not staking', async () => {
      await expect(atlasStakeStore.methods.releaseStake(from).send({other})).to.be.eventually.rejected;
    });
  });

  describe('Slashing', () => {
    const stake = 100;
    const firstPenalty = stake / 100;
    const secondPenalty = firstPenalty * 2;
    const thirdPenalty = secondPenalty * 2;
    const fourthPenalty = thirdPenalty * 2;

    beforeEach(async () => {
      await atlasStakeStore.methods.depositStake(from, 10).send({from, value: stake});
    });

    it('can not slash if not staking', async () => {
      await expect(atlasStakeStore.methods.slash(other, other).send({from})).to.be.eventually.rejected;
    });

    it('reject slash if not context internal call', async () => {
      await expect(atlasStakeStore.methods.slash(from, other).send({from: other})).to.be.eventually.rejected;
      expect(await atlasStakeStore.methods.getStake(from).call()).to.equal(stake.toString());
    });

    it('slashed stake goes to receiver', async () => {
      const balanceBefore = new BN(await web3.eth.getBalance(other));
      await atlasStakeStore.methods.slash(from, other).send({from});
      const balanceAfter = new BN(await web3.eth.getBalance(other));
      const expected = balanceBefore.add(new BN(firstPenalty));
      expect(balanceAfter.toString()).to.equal(expected.toString());
    });

    it('slashed stake is subtracted from contract balance', async () => {
      await atlasStakeStore.methods.slash(from, other).send({from});
      const contractBalance = new BN(await web3.eth.getBalance(atlasStakeStore.options.address));
      expect(contractBalance.toString()).to.equal(new BN(stake - firstPenalty).toString());
      const stakeAfterSlashing = await atlasStakeStore.methods.getStake(from).call();
      expect(stakeAfterSlashing).to.equal(new BN(stake - firstPenalty).toString());
    });

    it('penalty rises exponentially', async () => {
      await atlasStakeStore.methods.slash(from, other).send({from});
      await atlasStakeStore.methods.slash(from, other).send({from});
      await atlasStakeStore.methods.slash(from, other).send({from});
      await atlasStakeStore.methods.slash(from, other).send({from});
      const cumulatedPenalty = firstPenalty + secondPenalty + thirdPenalty + fourthPenalty;
      expect(await atlasStakeStore.methods.getStake(from).call()).to.eq((stake - cumulatedPenalty).toString());
    });

    it('can not have negative stake', async () => {
      await atlasStakeStore.methods.slash(from, other).send({from});
      await atlasStakeStore.methods.slash(from, other).send({from});
      await atlasStakeStore.methods.slash(from, other).send({from});
      await atlasStakeStore.methods.slash(from, other).send({from});
      await atlasStakeStore.methods.slash(from, other).send({from});
      await atlasStakeStore.methods.slash(from, other).send({from});
      await atlasStakeStore.methods.slash(from, other).send({from});
      expect(await atlasStakeStore.methods.getStake(from).call()).to.eq('0');
    });

    it('penalties updated after slashing', async () => {
      await atlasStakeStore.methods.slash(from, other).send({from});
      let blockTime = now;
      expect(await atlasStakeStore.methods.getPenaltiesHistory(from).call()).to.deep.include({
        lastPenaltyTime: blockTime.toString(),
        penaltiesCount: '1'
      });

      await setTimestamp(now + 1);
      await atlasStakeStore.methods.slash(from, other).send({from});
      blockTime = now + 1;
      expect(await atlasStakeStore.methods.getPenaltiesHistory(from).call()).to.deep.include({
        lastPenaltyTime: blockTime.toString(),
        penaltiesCount: '2'
      });

      await setTimestamp(now + 2);
      await atlasStakeStore.methods.slash(from, other).send({from});
      blockTime =  now + 2;
      expect(await atlasStakeStore.methods.getPenaltiesHistory(from).call()).to.deep.include({
        lastPenaltyTime: blockTime.toString(),
        penaltiesCount: '3'
      });
    });
  });
});
