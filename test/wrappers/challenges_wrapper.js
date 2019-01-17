/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import ChallengesWrapper from '../../src/wrappers/challenges_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Challenges Wrapper', () => {
  let challengesWrapper;
  let web3Mock;
  const defaultAddress = '0xdeadface';

  describe('earliestMeaningfulBlock', () => {
    const blockNumber = 1752205;
    const challengeDuration = 4 * 24 * 60 * 60;

    beforeEach(async () => {
      web3Mock = {
        eth: {
          getBlockNumber: sinon.stub().resolves(blockNumber)
        }
      };
      challengesWrapper = new ChallengesWrapper({}, web3Mock, defaultAddress);
    });

    it('computes earliest block', async () => {
      expect(await challengesWrapper.earliestMeaningfulBlock(challengeDuration)).to.equal(1683085); // 1752205 - 4 * 24 * 60 * 60 / 5
    });

    it('returns 0 when block count is too small for any challenge to expire', async () => {
      web3Mock.eth.getBlockNumber.resolves(10);
      expect(await challengesWrapper.earliestMeaningfulBlock(challengeDuration)).to.equal(0);
    });
  });

  describe('challenges', () => {
    const fromBlock = 4;
    const eventsStub = 'events';
    let getPastEventsStub;

    beforeEach(async () => {
      getPastEventsStub = sinon.stub().returns(eventsStub);
      const contractMock = {
        getPastEvents: getPastEventsStub
      };
      challengesWrapper = new ChallengesWrapper();
      sinon.stub(challengesWrapper, 'contract').resolves(contractMock);
    });

    it('gets past events', async () => {
      expect(await challengesWrapper.challenges(fromBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('ChallengeCreated', {fromBlock});
    });
  });

  describe('resolvedChallenges', () => {
    const fromBlock = 4;
    const eventsStub = 'events';
    let getPastEventsStub;

    beforeEach(async () => {
      getPastEventsStub = sinon.stub().returns(eventsStub);
      const contractMock = {
        getPastEvents: getPastEventsStub
      };
      challengesWrapper = new ChallengesWrapper();
      sinon.stub(challengesWrapper, 'contract').resolves(contractMock);
    });

    it('gets past events', async () => {
      expect(await challengesWrapper.resolvedChallenges(fromBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('ChallengeResolved', {fromBlock});
    });
  });

  describe('timedOutChallenges', () => {
    const fromBlock = 4;
    const eventsStub = 'events';
    let getPastEventsStub;

    beforeEach(async () => {
      getPastEventsStub = sinon.stub().returns(eventsStub);
      const contractMock = {
        getPastEvents: getPastEventsStub
      };
      challengesWrapper = new ChallengesWrapper();
      sinon.stub(challengesWrapper, 'contract').resolves(contractMock);
    });

    it('gets past events', async () => {
      expect(await challengesWrapper.timedOutChallenges(fromBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('ChallengeTimeout', {fromBlock});
    });
  });

  describe('resolve', () => {
    const challengeId = '0x123';
    let resolveChallengeStub;
    let resolveChallengeSendStub;
    let contractMock;

    beforeEach(async () => {
      resolveChallengeStub = sinon.stub();
      resolveChallengeSendStub = sinon.stub();
      resolveChallengeStub.returns({
        send: resolveChallengeSendStub
      });
      contractMock = {
        methods: {
          resolve: resolveChallengeStub
        }
      };
      challengesWrapper = new ChallengesWrapper({}, {}, defaultAddress);
      sinon.stub(challengesWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await challengesWrapper.resolve(challengeId);
      expect(resolveChallengeStub).to.be.calledWith(challengeId);
      expect(resolveChallengeSendStub).to.be.calledWith({from: defaultAddress});
    });
  });

  describe('canResolve', () => {
    const challengeId = '0x123';
    const defaultAddress = '0x123';
    const result = 'res';
    let canResolveStub;
    let canResolveCallStub;

    beforeEach(async () => {
      canResolveStub = sinon.stub();
      canResolveCallStub = sinon.stub().resolves(result);
      canResolveStub.returns({
        call: canResolveCallStub
      });
      const contractMock = {
        methods: {
          canResolve: canResolveStub
        }
      };
      challengesWrapper = new ChallengesWrapper({}, {}, defaultAddress);
      sinon.stub(challengesWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await challengesWrapper.canResolve(challengeId)).to.equal(result);
      expect(canResolveStub).to.be.calledWith(defaultAddress, challengeId);
      expect(canResolveCallStub).to.be.called;
    });
  });

  describe('isInProgress', () => {
    const challengeId = '0x123';
    const result = 'res';
    let challengeIsInProgressStub;
    let challengeIsInProgressCallStub;

    beforeEach(async () => {
      challengeIsInProgressStub = sinon.stub();
      challengeIsInProgressCallStub = sinon.stub().resolves(result);
      const contractMock = {
        methods: {
          challengeIsInProgress: challengeIsInProgressStub
        }
      };
      challengeIsInProgressStub.returns({
        call: challengeIsInProgressCallStub
      });
      challengesWrapper = new ChallengesWrapper();
      sinon.stub(challengesWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await challengesWrapper.isInProgress(challengeId)).to.equal(result);
      expect(challengeIsInProgressStub).to.be.calledWith(challengeId);
      expect(challengeIsInProgressCallStub).to.be.called;
    });
  });
});
