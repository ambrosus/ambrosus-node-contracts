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
import {APOLLO, ATLAS, HERMES} from '../../../src/consts';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;
const bundleId = utils.asciiToHex('bundleId');
const storagePeriods = 1;
const totalReward = 100;

describe('Sheltering Contract', () => {
  let web3;
  let hermes;
  let atlas;
  let apollo;
  let other;
  let bundleStore;
  let sheltering;
  let rolesStore;
  let atlasStakeStore;

  const isSheltering = async (sheltererId, bundleId) => sheltering.methods.isSheltering(sheltererId, bundleId).call();
  const storeBundle = async (bundleId, uploader, storagePeriods, sender = hermes) => sheltering.methods.store(bundleId, uploader, storagePeriods).send({from: sender});
  const storeBundleWithBundleStore = async (bundleId, uploader, storagePeriods, sender = hermes) => bundleStore.methods.store(bundleId, uploader, storagePeriods).send({from: sender});
  const addShelterer = async (bundleId, uploader, storagePeriods, sender = hermes) => sheltering.methods.addShelterer(bundleId, uploader, storagePeriods).send({from: sender});
  const addSheltererWithBundleStore = async (bundleId, uploader, storagePeriods, sender = hermes) => bundleStore.methods.addShelterer(bundleId, uploader, storagePeriods).send({from: sender});

  beforeEach(async () => {
    web3 = await createWeb3();
    [hermes, atlas, other] = await web3.eth.getAccounts();
    ({bundleStore, sheltering, atlasStakeStore, rolesStore} = await deploy({web3, contracts: {
      rolesStore: true,
      bundleStore: true,
      sheltering: true,
      atlasStakeStore: true,
      config: true,
      time: true
    }}));
    await rolesStore.methods.setRole(hermes, HERMES).send({from: hermes});
    await rolesStore.methods.setRole(atlas, ATLAS).send({from: hermes});
    await rolesStore.methods.setRole(apollo, APOLLO).send({from: hermes});
  });

  describe('isSheltering', () => {
    it(`returns false if account isn't bundle's shelterer`, async () => {
      expect(await isSheltering(hermes, bundleId)).to.equal(false);
    });

    it(`returns false if account is not bundle's shelterer`, async () => {
      expect(await isSheltering(hermes, bundleId)).to.equal(false);
      await storeBundleWithBundleStore(bundleId, hermes, storagePeriods);
      expect(await isSheltering(hermes, bundleId)).to.equal(false);
    });

    it(`returns true if account is bundle's shelterer`, async () => {
      expect(await isSheltering(other, bundleId)).to.equal(false);
      await storeBundleWithBundleStore(bundleId, hermes, storagePeriods);
      await addSheltererWithBundleStore(bundleId, other, totalReward);
      expect(await isSheltering(other, bundleId)).to.equal(true);
    });
  });

  describe('Storing', () => {
    it(`fails if already stored`, async () => {
      await storeBundle(bundleId, hermes, storagePeriods);
      await expect(storeBundle(bundleId, hermes, storagePeriods)).to.be.eventually.rejected;
    });

    it(`fails if already stored (different expiration date`, async () => {
      await storeBundle(bundleId, hermes, storagePeriods);
      await expect(storeBundle(bundleId, hermes, 1800000000)).to.be.eventually.rejected;
    });

    it('fails if not a context internal call', async () => {
      await expect(storeBundle(bundleId, hermes, storagePeriods, other)).to.be.eventually.rejected;
    });

    it('only hermes can upload a bundle', async () => {
      await expect(storeBundle(bundleId, atlas, storagePeriods)).to.be.eventually.rejected;
      await expect(storeBundle(bundleId, apollo, storagePeriods)).to.be.eventually.rejected;
    });
  });

  describe('Adding shelterer', () => {
    const exampleShelteringReward = 100;
    beforeEach(async () => {
      await storeBundle(bundleId, hermes, storagePeriods);
      await atlasStakeStore.methods.depositStake(atlas, 1).send({from: hermes, value: 1});
    });

    it(`adds store entry`, async () => {
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.not.include(atlas);
      await sheltering.methods.addShelterer(bundleId, atlas, exampleShelteringReward).send({from: hermes});
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.include(atlas);
    });

    it(`fails if already sheltered`, async () => {
      await addShelterer(bundleId, atlas, exampleShelteringReward);
      await expect(addShelterer(bundleId, atlas, exampleShelteringReward)).to.be.eventually.rejected;
    });

    it(`increments storage used`, async () => {
      expect(await atlasStakeStore.methods.getStorageUsed(atlas).call()).to.equal('0');
      await sheltering.methods.addShelterer(bundleId, atlas, exampleShelteringReward).send({from: hermes});
      expect(await atlasStakeStore.methods.getStorageUsed(atlas).call()).to.equal('1');
    });

    it('only atlas node can be a shelterer', async () => {
      await rolesStore.methods.setRole(other, HERMES).send({from: hermes});
      await expect(addShelterer(bundleId, apollo, exampleShelteringReward)).to.be.eventually.rejected;
      await expect(addShelterer(bundleId, other, exampleShelteringReward)).to.be.eventually.rejected;
    });
  });

  describe('Removing shelterer', () => {
    beforeEach(async () => {
      await atlasStakeStore.methods.depositStake(hermes, 1).send({from: hermes, value: 1});
      await sheltering.methods.store(bundleId, hermes, storagePeriods).send({from: hermes});
      await atlasStakeStore.methods.depositStake(other, 1).send({from: hermes, value: 1});
      await sheltering.methods.addShelterer(bundleId, other, totalReward).send({from: hermes});
    });

    it(`removes store entry`, async () => {
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.include(other);
      await sheltering.methods.removeShelterer(bundleId, other).send({from: hermes});
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.not.include(other);
    });

    it(`decrements storage used`, async () => {
      expect(await atlasStakeStore.methods.getStorageUsed(other).call()).to.equal('1');
      await sheltering.methods.removeShelterer(bundleId, other).send({from: hermes});
      expect(await atlasStakeStore.methods.getStorageUsed(other).call()).to.equal('0');
    });
  });
});
