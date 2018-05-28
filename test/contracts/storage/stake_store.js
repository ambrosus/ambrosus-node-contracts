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
import web3jsChai from '../../helpers/events';
import deployContracts from '../../../src/deploy';
import deployMockContext from '../../helpers/deployMockContext';


chai.use(web3jsChai());

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('StakeStore Contract', () => {
  let web3;
  let from;
  let other;
  let stakeStore;
  let bundleRegistry;
  let head;

  let BN;

  beforeEach(async () => {
    web3 = await createWeb3();
    ({BN} = web3.utils);
    [from, other] = await web3.eth.getAccounts();
    ({stakeStore, bundleRegistry, head} = await deployContracts(web3));
    await deployMockContext(web3, head, [from], [bundleRegistry.options.address, stakeStore.options.address]);
  });

  const transactionCost = async (tx) => {
    const receipt = await web3.eth.getTransactionReceipt(tx.transactionHash);
    return new BN(receipt.cumulativeGasUsed);
  };

  describe('Creating contract', () => {
    it('properly initialized', async () => {
      expect(await stakeStore.methods.isStaking(from).call()).to.be.false;
      expect(await stakeStore.methods.canStore(from).call()).to.be.false;
      expect(await stakeStore.methods.isShelteringAny(from).call()).to.be.false;
      expect(await stakeStore.methods.getStorageLeft(from).call()).to.be.eq('0');      
    });
  });

  describe('Can not stake', () => {
    it('if already staking', async () => {
      await stakeStore.methods.despositStake(1, 0).send({from, value: 1});
      await expect(stakeStore.methods.despositStake(1, 0).send({from, value: 1})).to.be.eventually.rejected;
      await expect(await stakeStore.methods.getStorageLeft(from).call()).to.eq('1');
    });
  });

  describe('Staking', () => {    
    beforeEach(async () => {
      await stakeStore.methods.despositStake(1, 0).send({from, value: 1});
    });

    it('initiate stake', async () => {
      expect(await stakeStore.methods.isStaking(from).call()).to.be.true;
      expect(await stakeStore.methods.canStore(from).call()).to.be.true;
      expect(await stakeStore.methods.isShelteringAny(from).call()).to.be.false;
      expect(await stakeStore.methods.getStorageLeft(from).call()).to.be.eq('1');
    });

    it('decrease storage', async () => {
      await stakeStore.methods.decreaseStorage(from).send({from});
      expect(await stakeStore.methods.isStaking(from).call()).to.be.true;
      expect(await stakeStore.methods.canStore(from).call()).to.be.false;
      expect(await stakeStore.methods.isShelteringAny(from).call()).to.be.true;
    });

    it('reject decrease storage if not context internal call', async () => {
      expect(stakeStore.methods.decreaseStorage(from).send({from: other})).to.be.eventually.rejected;
    });

    it('reject decreaseStorage if run out of storageLeft', async () => { 
      await stakeStore.methods.decreaseStorage(from).send({from});
      await expect(stakeStore.methods.decreaseStorage(from).send({from})).to.be.eventually.rejected;
    });

    it('release a stake updates information', async () => { 
      await stakeStore.methods.releaseStake().send({from, gasPrice: 1});
      expect(await stakeStore.methods.isStaking(from).call()).to.be.false;
      expect(await stakeStore.methods.canStore(from).call()).to.be.false;
      expect(await stakeStore.methods.isShelteringAny(from).call()).to.be.false;
      expect(await stakeStore.methods.getStorageLeft(from).call()).to.be.eq('0');    
    });

    it('release a stake send stake back', async () => { 
      const balanceBefore = new BN(await web3.eth.getBalance(from));
      const tx = await stakeStore.methods.releaseStake().send({from, gasPrice: 1});
      const balanceAfter = new BN(await web3.eth.getBalance(from));
      const expected = balanceBefore.add(new BN('1').sub(await transactionCost(tx)));
      expect(balanceAfter.eq(expected)).to.be.true;
    });

    it('can not release a stake if storing', async () => { 
      await stakeStore.methods.decreaseStorage(from).send({from});
      await expect(stakeStore.methods.releaseStake().send({from})).to.be.eventually.rejected;
    });

    it('can not release a stake if if not staking', async () => {       
      await expect(stakeStore.methods.releaseStake().send({other})).to.be.eventually.rejected;
    });
  });

  describe('Slashing', () => {
    beforeEach(async () => {
      await stakeStore.methods.despositStake(10, 0).send({from, value: 100});
    });
    
    it('can not slash if not staking', async () => {
      await expect(stakeStore.methods.slash(other, other, 1).send({from})).to.be.eventually.rejected;
    });

    it('can not have negative stake', async () => {
      await stakeStore.methods.slash(from, other, 200).send({from});
      expect(await stakeStore.methods.getStake(from).call()).to.eq('0');
    });

    it('reject slash if not context internal call', async () => {
      expect(stakeStore.methods.slash(from, other, 3).send({from: other})).to.be.eventually.rejected;
    });

    it('slashed stake goes to recevier', async () => {
      const balanceBefore = new BN(await web3.eth.getBalance(other));      
      await stakeStore.methods.slash(from, other, 3).send({from});
      const balanceAfter = new BN(await web3.eth.getBalance(other));
      const expected = balanceBefore.add(new BN('3'));      
      expect(balanceAfter.eq(expected)).to.be.true;
    });

    it('slashed stake is substracted from contract balance', async () => {
      await stakeStore.methods.slash(from, other, 3).send({from});
      const contractBalance = new BN(await web3.eth.getBalance(stakeStore.options.address));      
      expect(contractBalance.eq(new BN('97'))).to.be.true;      
      expect(await stakeStore.methods.getStake(from).call()).to.eq('97');
    });    
  });
});
