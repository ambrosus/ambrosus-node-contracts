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
import {asciiToHex} from '../../helpers/utils';

chai.use(web3jsChai());
chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('BundleStore Contract', () => {
  let web3;
  let from;
  let other;
  let bundleStore;
  let head;
  let bundleId;

  beforeEach(async () => {
    web3 = await createWeb3();
    [from, other] = await web3.eth.getAccounts();
    ({bundleStore, head} = await deployContracts(web3));
    await deployMockContext(web3, head, [from], ['0x0', '0x0', '0x0']);
    bundleId = asciiToHex(web3, 'bundleId');
  });

  describe('Storing a bundle', () => {
    it('should emit event when bundle was added', async () => {
      expect(await bundleStore.methods.store(bundleId, from, 10).send({from})).to.emitEvent('BundleStored');
    });

    it('creator is a shelterer', async () => {
      await bundleStore.methods.store(bundleId, from, 10).send({from});
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.deep.equal([from]);
    });

    it('stores expiration date', async () => {
      await bundleStore.methods.store(bundleId, from, 10).send({from});
      expect(await bundleStore.methods.getExpirationDate(bundleId).call()).to.equal('10');
    });

    it('reject if not context internal call', async () => {
      await expect(bundleStore.methods.store(bundleId, from, 10).send({from: other})).to.be.eventually.rejected;
    });

    it('reject if bundle with same id exists and has shelterers', async () => {
      await bundleStore.methods.store(bundleId, from, 10).send({from});
      await expect(bundleStore.methods.store(bundleId, from, 10).send({from})).to.be.eventually.rejected;
    });
  });

  describe('Add and remove shelterers', () => {
    beforeEach(async () => {
      await bundleStore.methods.store(bundleId, from, 10).send({from});
    });

    it('should emit event when the shelterer was added', async () => {
      expect(await bundleStore.methods.addShelterer(bundleId, other).send({from})).to.emitEvent('SheltererAdded');
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.deep.equal([from, other]);
    });

    it('should emit event when the shelterer was removed', async () => {
      expect(await bundleStore.methods.removeShelterer(bundleId, from).send({from})).to.emitEvent('SheltererRemoved');
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.deep.equal([]);
    });

    it('should do nothing if removing address who is not a shelterer', async () => {
      const tx = await bundleStore.methods.removeShelterer(bundleId, other).send({from});
      expect(tx.events).to.deep.equal({});
      expect(await bundleStore.methods.getShelterers(bundleId).call()).to.deep.equal([from]);
    });

    it('can put new bundle with same id when all shelterers are removed', async () => {
      await bundleStore.methods.removeShelterer(bundleId, from).send({from});
      await expect(bundleStore.methods.store(bundleId, from, 10).send({from})).to.be.eventually.fulfilled;
    });
  });
});
