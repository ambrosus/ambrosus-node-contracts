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
const storagePeriods = 1;
const totalReward = 100;

describe('Sheltering Contract', () => {
  let web3;
  let from;
  let other;
  let bundleStore;
  let sheltering;
  let stakeStore;

  beforeEach(async () => {
    web3 = await createWeb3();
    [from, other] = await web3.eth.getAccounts();
    ({bundleStore, sheltering, stakeStore} = await deploy({web3, contracts: {
      bundleStore: true,
      sheltering: true,
      stakeStore: true,
      config: true,
      time: true
    }}));
  });

  describe('isSheltering', () => {
    it(`returns false if account isn't bundle's shelterer`, async () => {
      expect(await sheltering.methods.isSheltering(from, bundleId).call()).to.equal(false);
    });

    it(`returns false if account is not bundle's shelterer`, async () => {
      expect(await sheltering.methods.isSheltering(from, bundleId).call()).to.equal(false);
      await bundleStore.methods.store(bundleId, from, storagePeriods).send({from});
      expect(await sheltering.methods.isSheltering(from, bundleId).call()).to.equal(false);
    });

    it(`returns true if account is bundle's shelterer`, async () => {
      expect(await sheltering.methods.isSheltering(other, bundleId).call()).to.equal(false);
      await bundleStore.methods.store(bundleId, from, storagePeriods).send({from});
      await bundleStore.methods.addShelterer(bundleId, other, totalReward).send({from});
      expect(await sheltering.methods.isSheltering(other, bundleId).call()).to.equal(true);
    });
  });

  describe('Storing', () => {
    beforeEach(async () => {
      await stakeStore.methods.depositStake(from, 1, 0).send({from, value: 1});
    });

    it(`fails if already stored`, async () => {
      await sheltering.methods.store(bundleId, from, storagePeriods).send({from});
      await expect(sheltering.methods.store(bundleId, from, storagePeriods).send({from})).to.be.eventually.rejected;
    });

    it(`fails if already stored (different expiration date`, async () => {
      await sheltering.methods.store(bundleId, from, storagePeriods).send({from});
      await expect(sheltering.methods.store(bundleId, from, 1800000000).send({from})).to.be.eventually.rejected;
    });

    it(`fails if already sheltered`, async () => {
      await sheltering.methods.store(bundleId, from, storagePeriods).send({from});
      await bundleStore.methods.addShelterer(bundleId, other, totalReward).send({from});
      await expect(bundleStore.methods.addShelterer(bundleId, other, totalReward).send({from})).to.be.eventually.rejected;
    });
  });

  describe('Adding shelterer', () => {
    const exampleShelteringReward = 100;
    beforeEach(async () => {
      await stakeStore.methods.depositStake(from, 1, 0).send({from, value: 1});
      await sheltering.methods.store(bundleId, from, storagePeriods).send({from});
      await stakeStore.methods.depositStake(other, 1, 0).send({from, value: 1});
    });

    it(`adds store entry`, async () => {
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.not.include(other);
      await sheltering.methods.addShelterer(bundleId, other, exampleShelteringReward).send({from});
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.include(other);
    });

    it(`increments storage used`, async () => {
      expect(await stakeStore.methods.getStorageUsed(other).call()).to.equal('0');
      await sheltering.methods.addShelterer(bundleId, other, exampleShelteringReward).send({from});
      expect(await stakeStore.methods.getStorageUsed(other).call()).to.equal('1');
    });
  });

  describe('Removing shelterer', () => {
    beforeEach(async () => {
      await stakeStore.methods.depositStake(from, 1, 0).send({from, value: 1});
      await sheltering.methods.store(bundleId, from, storagePeriods).send({from});
      await stakeStore.methods.depositStake(other, 1, 0).send({from, value: 1});
      await sheltering.methods.addShelterer(bundleId, other, totalReward).send({from});
    });
    
    it(`removes store entry`, async () => {
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.include(other);
      await sheltering.methods.removeShelterer(bundleId, other).send({from});
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.not.include(other);
    });

    it(`decrements storage used`, async () => {
      expect(await stakeStore.methods.getStorageUsed(other).call()).to.equal('1');
      await sheltering.methods.removeShelterer(bundleId, other).send({from});
      expect(await stakeStore.methods.getStorageUsed(other).call()).to.equal('0');
    });
  });
});
