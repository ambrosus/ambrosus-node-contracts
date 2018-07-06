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
import {latestTime} from '../../helpers/web3_utils';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('StakeStore Contract', () => {
  let web3;
  let from;
  let other;
  let stakeStore;

  beforeEach(async () => {
    ({web3, stakeStore} = await deploy({web3, contracts: {stakeStore: true, fees: true, config: true}}));
    [from, other] = await web3.eth.getAccounts();
  });

  const transactionCost = async (tx) => {
    const receipt = await web3.eth.getTransactionReceipt(tx.transactionHash);
    return new BN(receipt.cumulativeGasUsed);
  };

  describe('Deployment', () => {
    it('properly initialized', async () => {
      expect(await stakeStore.methods.isStaking(from).call()).to.be.false;
      expect(await stakeStore.methods.canStore(from).call()).to.be.false;
      expect(await stakeStore.methods.isShelteringAny(from).call()).to.be.false;
      expect(await stakeStore.methods.getStorageUsed(from).call()).to.be.eq('0');
      expect(await stakeStore.methods.getRole(from).call()).to.be.eq('0');
    });
  });

  describe('Deposit a stake', () => {    
    it('can not stake if already staking', async () => {
      await stakeStore.methods.depositStake(from, 1, 0).send({from, value: 1});
      await expect(stakeStore.methods.depositStake(from, 1, 0).send({from, value: 2})).to.be.eventually.rejected;
      await expect(await stakeStore.methods.getStake(from).call()).to.eq('1');
    });

    it('reject if not context internal call', async () => {
      await expect(stakeStore.methods.depositStake(from, 1, 0).send({from: other, value: 1})).to.be.eventually.rejected;
    });

    it('initiate stake', async () => {
      await stakeStore.methods.depositStake(from, 1, 0).send({from, value: 2});
      expect(await stakeStore.methods.isStaking(from).call()).to.be.true;
      expect(await stakeStore.methods.canStore(from).call()).to.be.true;
      expect(await stakeStore.methods.isShelteringAny(from).call()).to.be.false;
      expect(await stakeStore.methods.getStorageUsed(from).call()).to.be.eq('0');
      expect(await stakeStore.methods.getStorageLimit(from).call()).to.eq('1');
      expect(await stakeStore.methods.getPenaltiesHistory(from).call()).to.deep.include({
        lastPenaltyTime: '0',
        penaltiesCount: '0'
      });
      expect(await web3.eth.getBalance(stakeStore.options.address)).to.eq('2');
    });
  });

  describe('Increment storage used', () => {    
    beforeEach(async () => {
      await stakeStore.methods.depositStake(from, 1, 0).send({from, value: 1});
    });

    it('properly updates contract state', async () => {
      await stakeStore.methods.incrementStorageUsed(from).send({from});
      expect(await stakeStore.methods.isStaking(from).call()).to.be.true;
      expect(await stakeStore.methods.canStore(from).call()).to.be.false;
      expect(await stakeStore.methods.isShelteringAny(from).call()).to.be.true;
      expect(await stakeStore.methods.getStorageUsed(from).call()).to.be.eq('1');      
    });

    it('reject if not context internal call', async () => {
      await expect(stakeStore.methods.incrementStorageUsed(from).send({from: other})).to.be.eventually.rejected;
    });

    it('reject if run out of limit reached', async () => { 
      await stakeStore.methods.incrementStorageUsed(from).send({from});
      await expect(stakeStore.methods.incrementStorageUsed(from).send({from})).to.be.eventually.rejected;
    });
  });

  describe('Release a stake', () => {    
    beforeEach(async () => {
      await stakeStore.methods.depositStake(from, 1, 0).send({from, value: 1});
    });
  
    it('properly updates contract state', async () => { 
      await stakeStore.methods.releaseStake(from).send({from, gasPrice: 1});
      expect(await stakeStore.methods.isStaking(from).call()).to.be.false;
      expect(await stakeStore.methods.canStore(from).call()).to.be.false;
      expect(await stakeStore.methods.isShelteringAny(from).call()).to.be.false;
      expect(await stakeStore.methods.getStorageUsed(from).call()).to.be.eq('0');
      expect(await stakeStore.methods.getStake(from).call()).to.be.eq('0');
    });

    it('release a stake send stake back', async () => { 
      const balanceBefore = new BN(await web3.eth.getBalance(from));
      const tx = await stakeStore.methods.releaseStake(from).send({from, gasPrice: 1});
      const balanceAfter = new BN(await web3.eth.getBalance(from));
      const expected = balanceBefore.add(new BN('1').sub(await transactionCost(tx)));
      expect(balanceAfter.eq(expected)).to.be.true;
    });

    it('can not release a stake if not internal call', async () => {       
      expect(await stakeStore.methods.getStake(from).call()).to.be.eq('1');
      await expect(stakeStore.methods.releaseStake(from).send({from: other})).to.be.eventually.rejected;
    });

    it('can not release a stake if storing', async () => { 
      await stakeStore.methods.incrementStorageUsed(from).send({from});
      await expect(stakeStore.methods.releaseStake(from).send({from})).to.be.eventually.rejected;
    });

    it('can not release a stake if if not staking', async () => {       
      await expect(stakeStore.methods.releaseStake(from).send({other})).to.be.eventually.rejected;
    });
  });

  describe('Slashing', () => {
    const stake = 100;
    const firstPenalty = stake / 100;
    const secondPenalty = firstPenalty * 2;
    const thirdPenalty = secondPenalty * 2;
    const fourthPenalty = thirdPenalty * 2;
    
    beforeEach(async () => {
      await stakeStore.methods.depositStake(from, 10, 0).send({from, value: stake});
    });
    
    it('can not slash if not staking', async () => {
      await expect(stakeStore.methods.slash(other, other).send({from})).to.be.eventually.rejected;
    });

    it('reject slash if not context internal call', async () => {      
      await expect(stakeStore.methods.slash(from, other).send({from: other})).to.be.eventually.rejected;
      expect(await stakeStore.methods.getStake(from).call()).to.equal(stake.toString());      
    });

    it('slashed stake goes to receiver', async () => {
      const balanceBefore = new BN(await web3.eth.getBalance(other));      
      await stakeStore.methods.slash(from, other).send({from});
      const balanceAfter = new BN(await web3.eth.getBalance(other));
      const expected = balanceBefore.add(new BN(firstPenalty));      
      expect(balanceAfter.toString()).to.equal(expected.toString());
    });

    it('slashed stake is subtracted from contract balance', async () => {
      await stakeStore.methods.slash(from, other).send({from});
      const contractBalance = new BN(await web3.eth.getBalance(stakeStore.options.address));      
      expect(contractBalance.toString()).to.equal(new BN(stake - firstPenalty).toString());    
      const stakeAfterSlashing = await stakeStore.methods.getStake(from).call();
      expect(stakeAfterSlashing).to.equal(new BN(stake - firstPenalty).toString());   
    });    

    it('penalty rises exponentially', async () => {
      await stakeStore.methods.slash(from, other).send({from});
      await stakeStore.methods.slash(from, other).send({from});
      await stakeStore.methods.slash(from, other).send({from});
      await stakeStore.methods.slash(from, other).send({from});
      const cumulatedPenalty = firstPenalty + secondPenalty + thirdPenalty + fourthPenalty;
      expect(await stakeStore.methods.getStake(from).call()).to.eq((stake - cumulatedPenalty).toString());
    });

    it('can not have negative stake', async () => {
      await stakeStore.methods.slash(from, other).send({from});
      await stakeStore.methods.slash(from, other).send({from});
      await stakeStore.methods.slash(from, other).send({from});
      await stakeStore.methods.slash(from, other).send({from});
      await stakeStore.methods.slash(from, other).send({from});
      await stakeStore.methods.slash(from, other).send({from});
      await stakeStore.methods.slash(from, other).send({from});
      expect(await stakeStore.methods.getStake(from).call()).to.eq('0');
    });

    it('penalties updated after slashing', async () => {
      await stakeStore.methods.slash(from, other).send({from});
      let blockTime = await latestTime(web3);
      expect(await stakeStore.methods.getPenaltiesHistory(from).call()).to.deep.include({
        lastPenaltyTime: blockTime.toString(),
        penaltiesCount: '1'
      });

      await stakeStore.methods.slash(from, other).send({from});
      blockTime = await latestTime(web3);
      expect(await stakeStore.methods.getPenaltiesHistory(from).call()).to.deep.include({
        lastPenaltyTime: blockTime.toString(),
        penaltiesCount: '2'
      });

      await stakeStore.methods.slash(from, other).send({from});
      blockTime = await latestTime(web3);
      expect(await stakeStore.methods.getPenaltiesHistory(from).call()).to.deep.include({
        lastPenaltyTime: blockTime.toString(),
        penaltiesCount: '3'
      });
    });
  });
});
