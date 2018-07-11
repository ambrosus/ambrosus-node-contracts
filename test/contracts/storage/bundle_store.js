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

chai.use(chaiEmitEvents());
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
    bundleId = utils.asciiToHex('bundleId');
    await time.methods.setCurrentTimestamp(now).send({from});
  });

  describe('Storing a bundle', () => {
    it('should emit event when bundle was added', async () => {
      expect(await bundleStore.methods.store(bundleId, from, 1).send({from})).to.emitEvent('BundleStored');
    });

    it('creator is a shelterer', async () => {
      await bundleStore.methods.store(bundleId, from, storagePeriods).send({from});
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.deep.equal([from]);
    });

    it('stores storage duration', async () => {
      await bundleStore.methods.store(bundleId, from, storagePeriods).send({from});
      expect(await bundleStore.methods.getStoragePeriodsCount(bundleId).call()).to.equal(storagePeriods.toString());
    });

    it('stores expiration date', async () => {
      await bundleStore.methods.store(bundleId, from, storagePeriods).send({from});
      const actualExpirationDate = await bundleStore.methods.getShelteringExpirationDate(bundleId, from).call();
      const expectedExpirationDate = now + (storagePeriods * STORAGE_PERIOD_UNIT);
      expect(actualExpirationDate).to.equal(expectedExpirationDate.toString());
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
    beforeEach(async () => {
      await bundleStore.methods.store(bundleId, from, storagePeriods).send({from});
    });

    it('should emit event when the shelterer was added', async () => {
      expect(await bundleStore.methods.addShelterer(bundleId, other).send({from})).to.emitEvent('SheltererAdded');
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.deep.equal([from, other]);
    });

    it('should emit event when the shelterer was removed', async () => {
      expect(await bundleStore.methods.removeShelterer(bundleId, from).send({from})).to.emitEvent('SheltererRemoved');
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.deep.equal([]);
    });

    it('adds sheltering expiration dates', async () => {
      await bundleStore.methods.addShelterer(bundleId, other).send({from});
      const actualExpirationDate = await bundleStore.methods.getShelteringExpirationDate(bundleId, other).call();
      const expectedExpirationDate = now + (storagePeriods * STORAGE_PERIOD_UNIT);
      expect(actualExpirationDate).to.equal(expectedExpirationDate.toString());
    });

    it('removes sheltering expiration dates', async () => {
      await bundleStore.methods.removeShelterer(bundleId, from).send({from});
      const deletedExpirationDate = await bundleStore.methods.getShelteringExpirationDate(bundleId, from).call();
      expect(deletedExpirationDate).to.equal('0');
    });

    it('should do nothing if removing address who is not a shelterer', async () => {
      const tx = await bundleStore.methods.removeShelterer(bundleId, other).send({from});
      expect(tx.events).to.deep.equal({});
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.deep.equal([from]);
    });

    it('rejects if add shelterer to non-existing bundle', async () => {
      await expect(
        bundleStore.methods.addShelterer(utils.asciiToHex('unknownid'), other).send({from})).to.be.eventually.rejected;
    });

    it('rejects if add same shelterer twice', async () => {
      expect(await bundleStore.methods.addShelterer(bundleId, other).send({from})).to.emitEvent('SheltererAdded');
      await expect(bundleStore.methods.addShelterer(bundleId, other).send({from})).to.be.eventually.rejected;
    });

    it('cannot put new bundle with same id when all shelterers are removed', async () => {
      await bundleStore.methods.removeShelterer(bundleId, from).send({from});
      await expect(bundleStore.methods.store(bundleId, from, storagePeriods).send({from})).to.be.eventually.rejected;
    });
  });
});
