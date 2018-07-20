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
import {STORAGE_PERIOD_UNIT} from '../../../src/consts';
import TimeMockJson from '../../../build/contracts/TimeMock.json';

chai.use(chaiEmitEvents);
chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('BundleStore Contract', () => {
  let web3;
  let from;
  let other;
  let bundleStore;
  let time;
  let bundleId;
  const storagePeriods = 3;
  const now = 1500000000;

  beforeEach(async () => {
    ({web3, bundleStore, time} = await deploy({contracts: {bundleStore: true, config: true, time: TimeMockJson}}));
    [from, other] = await web3.eth.getAccounts();
    bundleId = utils.keccak256('bundleId');
    await time.methods.setCurrentTimestamp(now).send({from});
  });

  describe('Storing a bundle', () => {
    it('should emit event when bundle was added', async () => {
      expect(await bundleStore.methods.store(bundleId, from, 1).send({from}))
        .to.emitEvent('BundleStored')
        .withArgs({bundleId, uploader: from});
    });

    it('creator is saved as uploader', async () => {
      await bundleStore.methods.store(bundleId, from, storagePeriods).send({from});
      expect(await bundleStore.methods.getUploader(bundleId).call()).to.deep.equal(from);
      expect(await bundleStore.methods.isUploader(from, bundleId).call()).to.deep.equal(true);
    });

    it('stores upload timestamp', async () => {
      await bundleStore.methods.store(bundleId, from, storagePeriods).send({from});
      expect(await bundleStore.methods.getUploadTimestamp(bundleId).call()).to.equal(now.toString());
    });

    it('creator is not a shelterer', async () => {
      await bundleStore.methods.store(bundleId, from, storagePeriods).send({from});
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.deep.equal([]);
    });

    it('stores storage duration', async () => {
      await bundleStore.methods.store(bundleId, from, storagePeriods).send({from});
      expect(await bundleStore.methods.getStoragePeriodsCount(bundleId).call()).to.equal(storagePeriods.toString());
    });

    it('does not store expiration date', async () => {
      await bundleStore.methods.store(bundleId, from, storagePeriods).send({from});
      expect(await bundleStore.methods.getShelteringExpirationDate(bundleId, from).call()).to.equal('0');
    });

    it('reward for creator should be 0', async () => {
      await bundleStore.methods.store(bundleId, from, storagePeriods).send({from});
      const actualTotalReward = await bundleStore.methods.getTotalShelteringReward(bundleId, from).call();
      expect(actualTotalReward).to.equal('0');
    });

    it('reject if not context internal call', async () => {
      await expect(
        bundleStore.methods.store(bundleId, from, storagePeriods).send({from: other})).to.be.eventually.rejected;
    });

    it('reject if bundle with same id exists and has shelterers', async () => {
      await bundleStore.methods.store(bundleId, from, storagePeriods).send({from});
      await expect(bundleStore.methods.store(bundleId, from, storagePeriods).send({from})).to.be.eventually.rejected;
    });
  });

  describe('Add and remove shelterers', () => {
    const totalReward = 100;

    beforeEach(async () => {
      await bundleStore.methods.store(bundleId, from, storagePeriods).send({from});
      await bundleStore.methods.addShelterer(bundleId, other, totalReward).send({from});
    });

    it('should emit event when the shelterer was added', async () => {
      expect(await bundleStore.methods.addShelterer(bundleId, from, totalReward).send({from})).to.emitEvent('SheltererAdded')
        .withArgs({bundleId, shelterer: from});
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.deep.equal([other, from]);
    });

    it('should emit event when the shelterer was removed', async () => {
      expect(await bundleStore.methods.removeShelterer(bundleId, other).send({from})).to.emitEvent('SheltererRemoved')
        .withArgs({bundleId, shelterer: other});
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.deep.equal([]);
    });

    it('adds sheltering expiration dates', async () => {
      const actualExpirationDate = await bundleStore.methods.getShelteringExpirationDate(bundleId, other).call();
      const expectedExpirationDate = now + (storagePeriods * STORAGE_PERIOD_UNIT);
      expect(actualExpirationDate).to.equal(expectedExpirationDate.toString());
    });

    it('removes sheltering expiration dates', async () => {
      await bundleStore.methods.removeShelterer(bundleId, other).send({from});
      const deletedExpirationDate = await bundleStore.methods.getShelteringExpirationDate(bundleId, other).call();
      expect(deletedExpirationDate).to.equal('0');
    });

    it('adds sheltering start dates', async () => {
      const actualStartDate = await bundleStore.methods.getShelteringStartDate(bundleId, other).call();
      expect(actualStartDate).to.equal(now.toString());
    });

    it('removes sheltering start dates', async () => {
      await bundleStore.methods.removeShelterer(bundleId, other).send({from});
      const actualStartDate = await bundleStore.methods.getShelteringStartDate(bundleId, other).call();
      expect(actualStartDate).to.equal('0');
    });

    it('adds sheltering reward', async () => {
      const actualTotalReward = await bundleStore.methods.getTotalShelteringReward(bundleId, other).call();
      expect(actualTotalReward).to.equal(totalReward.toString());
    });

    it('removes sheltering reward', async () => {
      await bundleStore.methods.removeShelterer(bundleId, other).send({from});
      const actualTotalReward = await bundleStore.methods.getTotalShelteringReward(bundleId, other).call();
      expect(actualTotalReward).to.equal('0');
    });

    it('should do nothing if removing address who is not a shelterer', async () => {
      const tx = await bundleStore.methods.removeShelterer(bundleId, from).send({from});
      expect(tx.events).to.deep.equal({});
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.deep.equal([other]);
    });

    it('rejects if add shelterer to non-existing bundle', async () => {
      const unknownBundleId = utils.asciiToHex('unknownBundleId');
      await expect(bundleStore.methods.addShelterer(unknownBundleId, other, totalReward).send({from})).to.be.eventually.rejected;
    });

    it('rejects if add same shelterer twice', async () => {
      await expect(bundleStore.methods.addShelterer(bundleId, other, totalReward).send({from})).to.be.eventually.rejected;
    });

    it('cannot put new bundle with same id when all shelterers are removed', async () => {
      await bundleStore.methods.removeShelterer(bundleId, other).send({from});
      await expect(bundleStore.methods.store(bundleId, from, storagePeriods).send({from})).to.be.eventually.rejected;
    });
  });
});
