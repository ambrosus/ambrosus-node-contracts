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
import {STORAGE_PERIOD_UNIT} from '../../../src/consts';
import TimeMockJson from '../../../build/contracts/TimeMock.json';
import {createWeb3, makeSnapshot, restoreSnapshot, utils} from '../../../src/utils/web3_tools';

chai.use(chaiEmitEvents);
chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('BundleStore Contract', () => {
  let web3;
  let deployer;
  let targetUser;
  let otherUser;
  let bundleStore;
  let time;
  let bundleId;
  let snapshotId;
  const storagePeriods = 3;
  const now = 1500000000;

  const store = async (bundleId, uploader, storagePeriods, sender = deployer) => bundleStore.methods.store(bundleId, uploader, storagePeriods).send({from: sender});
  const getUploader = async (bundleId) => bundleStore.methods.getUploader(bundleId).call();
  const isUploader = async (user, bundleId) => bundleStore.methods.isUploader(user, bundleId).call();
  const getUploadTimestamp = async (bundleId) => bundleStore.methods.getUploadTimestamp(bundleId).call();
  const getShelterers = async (bundleId) => bundleStore.methods.getShelterers(bundleId).call();
  const getStoragePeriodsCount = async (bundleId) => bundleStore.methods.getStoragePeriodsCount(bundleId).call();
  const getShelteringStartDate = async (bundleId) => bundleStore.methods.getShelteringStartDate(bundleId, otherUser).call();
  const getTotalShelteringReward = async (bundleId, sender) => bundleStore.methods.getTotalShelteringReward(bundleId, sender).call();
  const getShelteringExpirationDate = async (bundleId, shelterer) => bundleStore.methods.getShelteringExpirationDate(bundleId, shelterer).call();
  const addShelterer = async (bundleId, shelterer, totalReward, sender = deployer) => bundleStore.methods.addShelterer(bundleId, shelterer, totalReward).send({from: sender});
  const removeShelterer = async (bundleId, shelterer, sender = deployer) => bundleStore.methods.removeShelterer(bundleId, shelterer).send({from: sender});

  before(async () => {
    web3 = await createWeb3();
    [deployer, targetUser, otherUser] = await web3.eth.getAccounts();
    ({bundleStore, time} = await deploy({
      web3,
      contracts: {
        bundleStore: true,
        config: true,
        time: TimeMockJson
      }
    }));
    bundleId = utils.keccak256('bundleId');
    await time.methods.setCurrentTimestamp(now).send({from: deployer});
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('Storing a bundle', () => {
    describe('Stores bundle correctly', () => {
      beforeEach(async () => {
        await store(bundleId, targetUser, storagePeriods);
      });

      it('creator is saved as uploader', async () => {
        expect(await getUploader(bundleId)).to.deep.equal(targetUser);
        expect(await isUploader(targetUser, bundleId)).to.deep.equal(true);
      });

      it('stores upload timestamp', async () => {
        expect(await getUploadTimestamp(bundleId)).to.equal(now.toString());
      });

      it('initially stores 0 shelterers', async () => {
        expect(await getShelterers(bundleId)).to.deep.equal([]);
      });

      it('stores storage duration', async () => {
        expect(await getStoragePeriodsCount(bundleId)).to.equal(storagePeriods.toString());
      });

      it('reward for creator should be 0', async () => {
        expect(await getTotalShelteringReward(bundleId, targetUser)).to.equal('0');
      });
    });

    it('should emit event when bundle was added', async () => {
      expect(await store(bundleId, targetUser, 1))
        .to.emitEvent('BundleStored')
        .withArgs({bundleId, uploader: targetUser});
    });

    it('reject if not context internal call', async () => {
      await expect(store(bundleId, targetUser, storagePeriods, otherUser)).to.be.eventually.rejected;
    });

    it('reject if bundle with same id exists and has shelterers', async () => {
      await store(bundleId, targetUser, storagePeriods);
      await expect(store(bundleId, targetUser, storagePeriods)).to.be.eventually.rejected;
    });
  });

  describe('Add and remove shelterers', () => {
    const totalReward = 100;

    beforeEach(async () => {
      await store(bundleId, targetUser, storagePeriods);
      await addShelterer(bundleId, otherUser, totalReward);
    });

    it('should emit event when the shelterer was added', async () => {
      expect(await addShelterer(bundleId, targetUser, totalReward)).to.emitEvent('SheltererAdded')
        .withArgs({bundleId, shelterer: targetUser});
      expect(await getShelterers(bundleId)).to.deep.equal([otherUser, targetUser]);
    });

    it('should emit event when the shelterer was removed', async () => {
      expect(await removeShelterer(bundleId, otherUser)).to.emitEvent('SheltererRemoved')
        .withArgs({bundleId, shelterer: otherUser});
      expect(await getShelterers(bundleId)).to.deep.equal([]);
    });

    it('adds sheltering expiration dates', async () => {
      const actualExpirationDate = await getShelteringExpirationDate(bundleId, otherUser);
      const expectedExpirationDate = now + (storagePeriods * STORAGE_PERIOD_UNIT);
      expect(actualExpirationDate).to.equal(expectedExpirationDate.toString());
    });

    it('removes sheltering expiration dates', async () => {
      await removeShelterer(bundleId, otherUser);
      const deletedExpirationDate = await getShelteringExpirationDate(bundleId, otherUser);
      expect(deletedExpirationDate).to.equal('0');
    });

    it('adds sheltering start dates', async () => {
      const actualStartDate = await getShelteringStartDate(bundleId, otherUser);
      expect(actualStartDate).to.equal(now.toString());
    });

    it('removes sheltering start dates', async () => {
      await removeShelterer(bundleId, otherUser);
      const actualStartDate = await getShelteringStartDate(bundleId, otherUser);
      expect(actualStartDate).to.equal('0');
    });

    it('adds sheltering reward', async () => {
      const actualTotalReward = await getTotalShelteringReward(bundleId, otherUser);
      expect(actualTotalReward).to.equal(totalReward.toString());
    });

    it('removes sheltering reward', async () => {
      await removeShelterer(bundleId, otherUser);
      const actualTotalReward = await getTotalShelteringReward(bundleId, otherUser);
      expect(actualTotalReward).to.equal('0');
    });

    it('should do nothing if removing address who is not a shelterer', async () => {
      const tx = await removeShelterer(bundleId, targetUser);
      expect(tx.events).to.deep.equal({});
      expect(await getShelterers(bundleId)).to.deep.equal([otherUser]);
    });

    it('rejects if add shelterer to non-existing bundle', async () => {
      const unknownBundleId = utils.asciiToHex('unknownBundleId');
      await expect(addShelterer(unknownBundleId, otherUser, totalReward)).to.be.eventually.rejected;
    });

    it('rejects if add same shelterer twice', async () => {
      await expect(addShelterer(bundleId, otherUser, totalReward)).to.be.eventually.rejected;
    });

    it('cannot put new bundle with same id when all shelterers are removed', async () => {
      await removeShelterer(bundleId, otherUser);
      await expect(store(bundleId, targetUser, storagePeriods)).to.be.eventually.rejected;
    });
  });
});
