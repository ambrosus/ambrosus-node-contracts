/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import chaiEmitEvents from '../../helpers/chaiEmitEvents';
import deploy from '../../helpers/deploy';
import utils from '../../helpers/utils';
import {SYSTEM_CHALLENGES_COUNT, HERMES, ATLAS} from '../../../src/consts';
import {BLOCK_REWARD, COINBASE} from '../../helpers/consts';
import BN from 'bn.js';

chai.use(chaiEmitEvents);

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;
const bundleId = utils.keccak256('bundleId');
                   
describe('Upload Contract', () => {
  let web3;
  let uploads;
  let sheltering;
  let challenges;
  let burnAddress;
  let config;
  let fees;
  let fee;
  let from;
  let kycWhitelist;

  const expectedMinersFee = () => fee.div(new BN(4));
  const expectedBurnAmount = () => fee.mul(new BN(5)).div(new BN(100));

  beforeEach(async () => {
    ({uploads, sheltering, fees, config, web3, challenges, kycWhitelist} = await deploy({
      contracts: {
        kycWhitelist: true,
        challenges: true,
        uploads: true, 
        sheltering: true,
        roles: true,
        time: true, 
        fees: true,
        config: true,
        stakeStore: true, 
        bundleStore: true}
    }));
    [from] = await web3.eth.getAccounts();
    fee = new BN(await fees.methods.getFeeForUpload(1).call());
  });

  describe('Uploads when stake deposited', () => {
    beforeEach(async () => {
      await kycWhitelist.methods.add(from, HERMES).send({from});            
    });

    it('emits event on upload', async () => {
      expect(await uploads.methods.registerBundle(bundleId, 1).send({from, value: fee})).to.emitEvent('BundleUploaded').withArgs({
        bundleId, storagePeriods: '1'
      });
    });

    it(`marks as sheltered`, async () => {
      expect(await sheltering.methods.isSheltering(from, bundleId).call({from})).to.equal(false);
      await uploads.methods.registerBundle(bundleId, 1).send({from, value: fee});
      expect(await sheltering.methods.isSheltering(from, bundleId).call()).to.equal(true);
    });

    it(`fails if fee too high`, async () => {      
      const value = fee.add(new BN(1));
      await expect(uploads.methods.registerBundle(bundleId, 1).send({from, value}))
        .to.be.eventually.rejected;
    });

    it(`fails if fee to low`, async () => {      
      const value = fee.sub(new BN(1));
      await expect(uploads.methods.registerBundle(bundleId, 1).send({from, value}))
        .to.be.eventually.rejected;
    });

    it(`fails if already uploaded (with the same endTime)`, async () => {
      await uploads.methods.registerBundle(bundleId, 1).send({from, value: fee});
      const promise = uploads.methods.registerBundle(bundleId, 1).send({from, value: fee}); 
      await expect(promise).to.be.eventually.rejected;
    });

    it(`fails if already uploaded (with different endTime)`, async () => {
      await uploads.methods.registerBundle(bundleId, 1).send({from, value: fee});
      const promise = uploads.methods.registerBundle(bundleId, 2).send({from, value: fee}); 
      await expect(promise).to.be.eventually.rejected;
    });

    it('Starts system challenges', async() => {
      await uploads.methods.registerBundle(bundleId, 1).send({from, value: fee});
      const events = await challenges.getPastEvents('ChallengeCreated');
      expect(events.length).to.eq(1);
      expect(events[0].returnValues).to.deep.include({
        bundleId,
        count: SYSTEM_CHALLENGES_COUNT.toString()
      });
    });

    it('Pay fee to miner', async() => {
      const balanceBefore = new BN(await web3.eth.getBalance(COINBASE));
      await uploads.methods.registerBundle(bundleId, 1).send({from, value: fee, gasPrice: '0'});
      const balanceAfter = new BN(await web3.eth.getBalance(COINBASE));
      const actualFee = balanceAfter.sub(balanceBefore).sub(BLOCK_REWARD);
      expect(actualFee.eq(expectedMinersFee())).to.be.true;
    });

    it('Burn tokens', async() => {
      burnAddress = await config.methods.BURN_ADDRESS().call();
      const balanceBefore = new BN(await web3.eth.getBalance(burnAddress));
      await uploads.methods.registerBundle(bundleId, 1).send({from, value: fee, gasPrice: '0'});
      const balanceAfter = new BN(await web3.eth.getBalance(burnAddress));
      expect(balanceAfter.sub(balanceBefore).eq(expectedBurnAmount())).to.be.true;
    });
  });

  describe('Uploads when stake not white listed', () => {
    it(`fails if sender is not white listed`, async () => {      
      await expect(uploads.methods.registerBundle(bundleId, 1).send({from, value: fee}))
        .to.be.eventually.rejected;      
    });

    it(`fails if sender is not white listed as Hermes`, async () => {
      await kycWhitelist.methods.add(from, ATLAS).send({from});
      await expect(uploads.methods.registerBundle(bundleId, 1).send({from, value: fee}))
        .to.be.eventually.rejected;      
    });
  });
});
