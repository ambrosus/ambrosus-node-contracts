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
import ChallengesEventEmitterWrapper from '../../src/wrappers/challenges_event_emitter_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Challenge Event Emitter Wrapper', () => {
  const fromBlock = 4;
  const toBlock = 6;
  const eventsStub = 'events';
  let getPastEventsStub;
  let challengeEventEmitterWrapper;

  beforeEach(async () => {
    getPastEventsStub = sinon.stub().returns(eventsStub);
    const contractMock = {
      getPastEvents: getPastEventsStub
    };
    challengeEventEmitterWrapper = new ChallengesEventEmitterWrapper();
    sinon.stub(challengeEventEmitterWrapper, 'contract').resolves(contractMock);
  });

  describe('challenges', () => {
    it('gets past events', async () => {
      expect(await challengeEventEmitterWrapper.challenges(fromBlock, toBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('ChallengeCreated', {fromBlock, toBlock});
    });
  });

  describe('resolvedChallenges', () => {
    it('gets past events', async () => {
      expect(await challengeEventEmitterWrapper.resolvedChallenges(fromBlock, toBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('ChallengeResolved', {fromBlock, toBlock});
    });
  });

  describe('timedOutChallenges', () => {
    it('gets past events', async () => {
      expect(await challengeEventEmitterWrapper.timedOutChallenges(fromBlock, toBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('ChallengeTimeout', {fromBlock, toBlock});
    });
  });
});
