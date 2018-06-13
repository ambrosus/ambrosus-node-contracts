/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createWeb3} from '../../../src/web3_tools';
import web3jsChai from '../../helpers/events';
import deployAll from '../../helpers/deployAll';
import BN from 'bn.js';
import {ATLAS, APOLLO, ATLAS1_STAKE, APOLLO_STAKE, ATLAS1_STORAGE_LIMIT, ONE} from '../../../src/consts';

chai.use(web3jsChai());
chai.use(chaiAsPromised);

const {expect} = chai;

const NON_EXISTING_ROLE = 3;


describe('Stakes Contract', () => {
  let web3;
  let stakes;
  let stakeStore;
  let from;
  let other;
  let kycWhitelist;

  beforeEach(async () => {
    web3 = await createWeb3();    
    ({stakes, stakeStore, kycWhitelist} = await deployAll(web3));
    [from, other] = await web3.eth.getAccounts();
    await kycWhitelist.methods.add(from).send({from});
  });

  describe('Start staking', () => {
    it('Not whitelisted', async () => {
      await expect(stakes.methods.depositStake(ATLAS).send({from: other, value: ATLAS1_STAKE})).to.be.eventually.rejected;
      expect(await web3.eth.getBalance(stakes.options.address)).to.eq('0');
      expect(await web3.eth.getBalance(stakeStore.options.address)).to.eq('0');
    });

    it('Start staking', async () => {
      await stakes.methods.depositStake(ATLAS).send({from, value: ATLAS1_STAKE});      
      expect(await web3.eth.getBalance(stakes.options.address)).to.eq('0');
      expect(await web3.eth.getBalance(stakeStore.options.address)).to.eq(ATLAS1_STAKE.toString());
      expect(await stakeStore.methods.getStake(from).call()).to.eq(ATLAS1_STAKE.toString());
      expect(await stakeStore.methods.getStorageLimit(from).call()).to.eq(ATLAS1_STORAGE_LIMIT.toString());
    });

    it('Deposit twice', async () => {
      await stakes.methods.depositStake(ATLAS).send({from, value: ATLAS1_STAKE});
      await expect(stakes.methods.depositStake(ATLAS).send({from, value: ATLAS1_STAKE})).to.be.eventually.rejected;
      expect(await web3.eth.getBalance(stakes.options.address)).to.eq('0');
      expect(await web3.eth.getBalance(stakeStore.options.address)).to.eq(ATLAS1_STAKE.toString());
    });

    it('Stake too low (just a bit)', async () => {
      const value = ATLAS1_STAKE.sub(ONE);
      await expect(stakes.methods.depositStake(ATLAS).send({from, value})).to.be.eventually.rejected;
      expect(await web3.eth.getBalance(stakes.options.address)).to.eq('0');
      expect(await web3.eth.getBalance(stakeStore.options.address)).to.eq('0');      
    });

    it('Stake too low for the role', async () => {
      const value = APOLLO_STAKE.sub(ONE);
      await expect(stakes.methods.depositStake(APOLLO).send({from, value})).to.be.eventually.rejected;
      expect(await web3.eth.getBalance(stakes.options.address)).to.eq('0');
      expect(await web3.eth.getBalance(stakeStore.options.address)).to.eq('0');      
    });    

    it('Stake too low (zero)', async () => {
      await expect(stakes.methods.depositStake(ATLAS).send({from, value: 0})).to.be.eventually.rejected;
      expect(await web3.eth.getBalance(stakes.options.address)).to.eq('0');
      expect(await web3.eth.getBalance(stakeStore.options.address)).to.eq('0');
    });

    it('Invalid role', async () => {
      await expect(stakes.methods.depositStake(NON_EXISTING_ROLE).send({from, value: 100})).to.be.eventually.rejected;
      expect(await web3.eth.getBalance(stakes.options.address)).to.eq('0');
      expect(await web3.eth.getBalance(stakeStore.options.address)).to.eq('0');
    });
  });

  describe('Release stake', () => {
    it('Clears stake and sends it back', async () => {
      await stakes.methods.depositStake(ATLAS).send({from, value: ATLAS1_STAKE});
      expect(await stakeStore.methods.getStake(from).call()).to.eq(ATLAS1_STAKE.toString());
      const balanceBeforeRelease = new BN(await web3.eth.getBalance(from));
      await stakes.methods.releaseStake().send({from, gasPrice: '0'});
      const balanceAfterRelease = new BN(await web3.eth.getBalance(from));
      const balanceWithReturnedStake = balanceBeforeRelease.add(new BN(ATLAS1_STAKE));
      expect(balanceAfterRelease).to.deep.equal(balanceWithReturnedStake);
      expect(await stakeStore.methods.getStake(from).call()).to.eq('0');
    });

    it('Rejects if sender is not staking', async () => {
      await expect(stakes.methods.releaseStake().send({from})).to.be.eventually.rejected;
    });

    it('Rejects if sender is still sheltering', async () => {
      await stakes.methods.depositStake(ATLAS).send({from, value: ATLAS1_STAKE});
      await stakeStore.methods.incrementStorageUsed(from).send({from});
      await expect(stakes.methods.releaseStake().send({from})).to.be.eventually.rejected;
      expect(await stakeStore.methods.getStake(from).call()).to.equal(ATLAS1_STAKE.toString());
    });
  });
});
