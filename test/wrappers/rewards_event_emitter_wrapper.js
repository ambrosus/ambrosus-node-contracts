/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import RewardsEventEmitterWrapper from '../../src/wrappers/rewards_event_emitter_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Payouts Event Emitter Wrapper', () => {
  const fromBlock = 4;
  const toBlock = 6;
  const eventsStub = 'events';
  let getPastEventsStub;
  let rewardsEventEmitterWrapper;

  beforeEach(async () => {
    getPastEventsStub = sinon.stub().returns(eventsStub);
    const contractMock = {
      getPastEvents: getPastEventsStub
    };
    rewardsEventEmitterWrapper = new RewardsEventEmitterWrapper();
    sinon.stub(rewardsEventEmitterWrapper, 'contract').resolves(contractMock);
  });

  describe('atlasPayoutWithdrawals', () => {
    it('gets past events', async () => {
      expect(await rewardsEventEmitterWrapper.atlasPayoutWithdrawals(fromBlock, toBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('AtlasPayoutWithdrawal', {fromBlock, toBlock});
    });
  });

  describe('apolloBundleFeePayout', () => {
    it('gets past events', async () => {
      expect(await rewardsEventEmitterWrapper.apolloBundleFeePayout(fromBlock, toBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('ApolloBundleFeePayout', {fromBlock, toBlock});
    });
  });
});
