/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {expect} from 'chai';
import sinon from 'sinon';
import BundleStoreWrapper from '../../src/wrappers/bundle_store_wrapper';

describe('Bundle Store Wrapper', () => {
  let bundleStoreWrapper;

  describe('bundlesStored', () => {
    const fromBlock = 4;
    const toBlock = 6;
    const eventsStub = 'events';
    let getPastEventsStub;

    beforeEach(async () => {
      getPastEventsStub = sinon.stub().returns(eventsStub);
      const contractMock = {
        getPastEvents: getPastEventsStub
      };
      bundleStoreWrapper = new BundleStoreWrapper();
      sinon.stub(bundleStoreWrapper, 'contract').resolves(contractMock);
    });

    it('gets past events', async () => {
      expect(await bundleStoreWrapper.bundlesStored(fromBlock, toBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('BundleStored', {fromBlock, toBlock});
    });
  });
});
