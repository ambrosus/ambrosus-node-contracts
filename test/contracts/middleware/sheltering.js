/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import utils from '../../helpers/utils';
import deploy from '../../helpers/deploy';
import {ATLAS, HERMES, STORAGE_PERIOD_UNIT} from '../../../src/consts';
import TimeMockJson from '../../../build/contracts/TimeMock.json';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;
const bundleId = utils.asciiToHex('bundleId');
const storagePeriods = 3;
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
  let time;
  let atlasStakeStore;
  let snapshotId;
  const now = 1500000000;

  const isSheltering = async (bundleId, shelterer) => sheltering.methods.isSheltering(bundleId, shelterer).call();
  const getShelteringData = async (bundleId, shelterer) => sheltering.methods.getShelteringData(bundleId, shelterer).call();
  const shelteringExpirationDate = async (bundleId, shelterer) => sheltering.methods.getShelteringExpirationDate(bundleId, shelterer).call();
  const storeBundle = async (bundleId, uploader, storagePeriods, sender = hermes) => sheltering.methods.store(bundleId, uploader, storagePeriods).send({from: sender});
  const addShelterer = async (bundleId, shelterer, amount, sender = hermes) => sheltering.methods.addShelterer(bundleId, shelterer, amount).send({from: sender});
  const removeShelterer = async (bundleId, shelterer, sender = hermes) => sheltering.methods.removeShelterer(bundleId, shelterer).send({from: sender});
  const getShelterers = async (bundleId) => bundleStore.methods.getShelterers(bundleId).call();
  const getStorageUsed = async (staker) => atlasStakeStore.methods.getStorageUsed(staker).call();
  const depositStake = async (staker, storageLimit, value, sender = hermes) => atlasStakeStore.methods.depositStake(staker, storageLimit).send({from: sender, value});
  const injectBundleWithBundleStore = async (bundleId, uploader, storagePeriods, sender = hermes) => bundleStore.methods.store(bundleId, uploader, storagePeriods).send({from: sender});
  const injectSheltererWithBundleStore = async (bundleId, shelterer, storagePeriods, sender = hermes) => bundleStore.methods.addShelterer(bundleId, shelterer, storagePeriods).send({from: sender});
  const setTimestamp = async (timestamp) => time.methods.setCurrentTimestamp(timestamp).send({from: hermes});

  before(async () => {
    web3 = await createWeb3();
    [hermes, atlas, apollo, other] = await web3.eth.getAccounts();
    ({bundleStore, sheltering, atlasStakeStore, rolesStore, time} = await deploy({
      web3,
      contracts: {
        rolesStore: true,
        bundleStore: true,
        sheltering: true,
        atlasStakeStore: true,
        config: true,
        time: TimeMockJson
      }
    }));
    await rolesStore.methods.setRole(hermes, HERMES).send({from: hermes});
    await rolesStore.methods.setRole(atlas, ATLAS).send({from: hermes});
    await setTimestamp(now);
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('isSheltering', () => {
    it(`returns false if account isn't bundle's shelterer`, async () => {
      expect(await isSheltering(bundleId, hermes)).to.equal(false);
    });

    it(`returns false if account is not bundle's shelterer`, async () => {
      expect(await isSheltering(bundleId, hermes)).to.equal(false);
      await injectBundleWithBundleStore(bundleId, hermes, storagePeriods);
      expect(await isSheltering(bundleId, hermes)).to.equal(false);
    });

    it(`returns true if account is bundle's shelterer`, async () => {
      expect(await isSheltering(bundleId, other)).to.equal(false);
      await injectBundleWithBundleStore(bundleId, hermes, storagePeriods);
      await injectSheltererWithBundleStore(bundleId, other, totalReward);
      expect(await isSheltering(bundleId, other)).to.equal(true);
    });

    it('returns false if sheltering has expired', async () => {
      await injectBundleWithBundleStore(bundleId, hermes, storagePeriods);
      await injectSheltererWithBundleStore(bundleId, other, totalReward);
      await setTimestamp('2500000000');
      expect(await isSheltering(bundleId, other)).to.equal(false);
    });
  });

  describe('Storing', () => {
    it('adds bundle to bundleStore', async () => {
      await storeBundle(bundleId, hermes, storagePeriods);
      expect(await bundleStore.methods.getUploader(bundleId).call()).to.equal(hermes);
      expect(await bundleStore.methods.getStoragePeriodsCount(bundleId).call()).to.equal(storagePeriods.toString());
    });

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

    it('is context internal', async () => {
      await expect(storeBundle(bundleId, hermes, storagePeriods, other)).to.be.eventually.rejected;
    });
  });

  describe('Adding shelterer', () => {
    const exampleShelteringReward = 100;

    beforeEach(async () => {
      await storeBundle(bundleId, hermes, storagePeriods);
      await depositStake(atlas, 1, 1);
    });

    it(`adds store entry`, async () => {
      expect(await getShelterers(bundleId)).to.not.include(atlas);
      await addShelterer(bundleId, atlas, exampleShelteringReward);
      expect(await getShelterers(bundleId)).to.include(atlas);
    });

    it(`fails if already sheltered`, async () => {
      await addShelterer(bundleId, atlas, exampleShelteringReward);
      await expect(addShelterer(bundleId, atlas, exampleShelteringReward)).to.be.eventually.rejected;
    });

    it(`increments storage used`, async () => {
      expect(await getStorageUsed(atlas)).to.equal('0');
      await addShelterer(bundleId, atlas, exampleShelteringReward);
      expect(await getStorageUsed(atlas)).to.equal('1');
    });

    it('cannot shelter if the storage limit is 0', async () => {
      await expect(addShelterer(bundleId, other, exampleShelteringReward)).to.be.eventually.rejected;
    });

    it('is context internal', async () => {
      await expect(addShelterer(bundleId, atlas, exampleShelteringReward, other)).to.be.eventually.rejected;
    });
  });

  describe('Removing shelterer', () => {
    beforeEach(async () => {
      await storeBundle(bundleId, hermes, storagePeriods);
      await depositStake(other, 1, 1);
      await addShelterer(bundleId, other, totalReward);
    });

    it(`removes store entry`, async () => {
      expect(await getShelterers(bundleId)).to.include(other);
      await removeShelterer(bundleId, other);
      expect(await getShelterers(bundleId)).to.not.include(other);
    });

    it(`decrements storage used`, async () => {
      expect(await getStorageUsed(other)).to.equal('1');
      await removeShelterer(bundleId, other);
      expect(await getStorageUsed(other)).to.equal('0');
    });

    it('is context internal', async () => {
      await expect(removeShelterer(bundleId, other, other)).to.be.eventually.rejected;
    });
  });

  describe('getShelteringData', () => {
    beforeEach(async () => {
      await storeBundle(bundleId, hermes, storagePeriods);
      await depositStake(other, 1, 1);
      await addShelterer(bundleId, other, totalReward);
    });

    it('gets data about the sheltering', async () => {
      const {startingDate, storagePeriods: storagePeriondsReturned, totalReward: totalRewardReturned} = await getShelteringData(bundleId, other);
      expect(startingDate).to.not.equal('0');
      expect(storagePeriondsReturned).to.equal(storagePeriods.toString());
      expect(totalRewardReturned).to.equal(totalReward.toString());
    });
  });

  describe('getShelteringExpirationDate', () => {
    beforeEach(async () => {
      await storeBundle(bundleId, hermes, storagePeriods);
      await depositStake(other, 1, 1);
      await addShelterer(bundleId, other, totalReward);
    });

    it('returns expiration date', async () => {
      expect(await shelteringExpirationDate(bundleId, other)).to.equal((now + (storagePeriods * STORAGE_PERIOD_UNIT)).toString());
    });
  });
});
