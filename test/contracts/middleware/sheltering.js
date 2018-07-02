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
import utils from '../../helpers/utils';
import deploy from '../../helpers/deploy';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;
const bundleId = utils.asciiToHex('bundleId');
const units = 1;

describe('Sheltering Contract', () => {
  let web3;
  let from;
  let bundleStore;
  let sheltering;
  let stakeStore;

  beforeEach(async () => {
    web3 = await createWeb3();
    [from] = await web3.eth.getAccounts();
    ({bundleStore, sheltering, stakeStore} = await deploy({web3, contracts: {
      bundleStore: true,
      sheltering: true,
      stakeStore: true,
      config: true
    }}));
  });

  describe('isStored', () => {
    it(`returns false if account isn't bundle's shelterer`, async () => {
      expect(await sheltering.methods.isSheltering(from, bundleId).call()).to.equal(false);
    });

    it(`returns true if account is bundle's shelterer`, async () => {
      expect(await sheltering.methods.isSheltering(from, bundleId).call()).to.equal(false);
      await bundleStore.methods.store(bundleId, from, units).send({from});            
      expect(await sheltering.methods.isSheltering(from, bundleId).call()).to.equal(true);
    });
  });

  describe('Storing when staking', () => {
    beforeEach(async () => {
      await stakeStore.methods.depositStake(from, 1, 0).send({from, value: 1});
    });

    it(`marks as sheltered`, async () => {
      expect(await sheltering.methods.isSheltering(from, bundleId).call()).to.equal(false);
      await sheltering.methods.store(bundleId, from, units).send({from});
      expect(await sheltering.methods.isSheltering(from, bundleId).call()).to.equal(true);
    });

    it(`fails if already sheltering`, async () => {
      await sheltering.methods.store(bundleId, from, units).send({from});
      await expect(sheltering.methods.store(bundleId, from, units).send({from})).to.be.eventually.rejected;
    });

    it(`fails if already sheltering (different expiration date`, async () => {
      await sheltering.methods.store(bundleId, from, units).send({from});
      await expect(sheltering.methods.store(bundleId, from, 1800000000).send({from})).to.be.eventually.rejected;
    });

    it(`increments storage used`, async () => {
      expect(await stakeStore.methods.getStorageUsed(from).call({from})).to.eq('0');
      await sheltering.methods.store(bundleId, from, units).send({from});
      expect(await stakeStore.methods.getStorageUsed(from).call({from})).to.eq('1');
    });
  });
  
  describe('Storing when not staking', () => {
    it(`fails (sender is not staking)`, async () => {      
      await expect(sheltering.methods.store(bundleId, from, units).send({from})).to.be.eventually.rejected;
    });
  });
});
