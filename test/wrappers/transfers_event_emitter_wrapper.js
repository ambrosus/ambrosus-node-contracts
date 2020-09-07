/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import TransfersEventEmitterWrapper from '../../src/wrappers/transfers_event_emitter_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Transfer Event Emitter Wrapper', () => {
  const fromBlock = 4;
  const toBlock = 6;
  const eventsStub = 'events';
  let getPastEventsStub;
  let transferEventEmitterWrapper;

  beforeEach(async () => {
    getPastEventsStub = sinon.stub().returns(eventsStub);
    const contractMock = {
      getPastEvents: getPastEventsStub
    };
    transferEventEmitterWrapper = new TransfersEventEmitterWrapper();
    sinon.stub(transferEventEmitterWrapper, 'contract').resolves(contractMock);
  });

  describe('transfers', () => {
    it('gets past events', async () => {
      expect(await transferEventEmitterWrapper.transfers(fromBlock, toBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('TransferStarted', {fromBlock, toBlock});
    });
  });

  describe('resolvedTransfers', () => {
    it('gets past events', async () => {
      expect(await transferEventEmitterWrapper.resolvedTransfers(fromBlock, toBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('TransferResolved', {fromBlock, toBlock});
    });
  });

  describe('cancelledTransfers', () => {
    it('gets past events', async () => {
      expect(await transferEventEmitterWrapper.cancelledTransfers(fromBlock, toBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('TransferCancelled', {fromBlock, toBlock});
    });
  });
});
