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
    const toBlock = 6;
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
      expect(await challengesWrapper.challenges(fromBlock, toBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('ChallengeCreated', {fromBlock, toBlock});
    });
  });

  describe('resolvedChallenges', () => {
    const fromBlock = 4;
    const toBlock = 6;
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
      expect(await challengesWrapper.resolvedChallenges(fromBlock, toBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('ChallengeResolved', {fromBlock, toBlock});
    });
  });

  describe('timedOutChallenges', () => {
    const fromBlock = 4;
    const toBlock = 6;
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
      expect(await challengesWrapper.timedOutChallenges(fromBlock, toBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('ChallengeTimeout', {fromBlock, toBlock});
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

  describe('start', () => {
    const sheltererId = '0xc0ffee';
    const bundleId = '0xbeef';
    const fee = '10';
    let startChallengeStub;
    let startChallengeSendStub;
    let contractMock;

    beforeEach(() => {
      startChallengeStub = sinon.stub();
      startChallengeSendStub = sinon.stub();
      startChallengeStub.returns({
        send: startChallengeSendStub
      });
      contractMock = {
        methods: {
          start: startChallengeStub
        }
      };
      challengesWrapper = new ChallengesWrapper({}, {}, defaultAddress, true);
      sinon.stub(challengesWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await challengesWrapper.start(sheltererId, bundleId, fee);
      expect(startChallengeStub).to.be.calledWith(sheltererId, bundleId);
      expect(startChallengeSendStub).to.be.calledWith({from: defaultAddress, value: fee});
    });
  });

  describe('markAsExpired', () => {
    const challengeId = '0xc0ffee';
    let markAsExpiredStub;
    let markAsExpiredSendStub;
    let contractMock;

    beforeEach(() => {
      markAsExpiredStub = sinon.stub();
      markAsExpiredSendStub = sinon.stub();
      markAsExpiredStub.returns({
        send: markAsExpiredSendStub
      });
      contractMock = {
        methods: {
          markAsExpired: markAsExpiredStub
        }
      };
      challengesWrapper = new ChallengesWrapper({}, {}, defaultAddress, true);
      sinon.stub(challengesWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await challengesWrapper.markAsExpired(challengeId);
      expect(markAsExpiredStub).to.be.calledWith(challengeId);
      expect(markAsExpiredSendStub).to.be.calledWith({from: defaultAddress});
    });
  });


  describe('challengeIsTimedOut', () => {
    const challengeId = '0x123';
    const result = 'res';
    let challengeIsTimedOutStub;
    let challengeIsTimedOutCallStub;

    beforeEach(async () => {
      challengeIsTimedOutStub = sinon.stub();
      challengeIsTimedOutCallStub = sinon.stub().resolves(result);
      challengeIsTimedOutStub.returns({
        call: challengeIsTimedOutCallStub
      });
      const contractMock = {
        methods: {
          challengeIsTimedOut: challengeIsTimedOutStub
        }
      };
      challengesWrapper = new ChallengesWrapper({}, {}, defaultAddress);
      sinon.stub(challengesWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await challengesWrapper.challengeIsTimedOut(challengeId)).to.equal(result);
      expect(challengeIsTimedOutStub).to.be.calledWith(challengeId);
      expect(challengeIsTimedOutCallStub).to.be.called;
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

  describe('getChallengeId', () => {
    const sheltererId = '0xc0ffee';
    const bundleId = '0xbeef';
    const result = 'res';
    let getChallengeIdStub;
    let getChallengeIdCallStub;

    beforeEach(async () => {
      getChallengeIdStub = sinon.stub();
      getChallengeIdCallStub = sinon.stub().resolves(result);
      getChallengeIdStub.returns({
        call: getChallengeIdCallStub
      });
      const contractMock = {
        methods: {
          getChallengeId: getChallengeIdStub
        }
      };
      challengesWrapper = new ChallengesWrapper();
      sinon.stub(challengesWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await challengesWrapper.getChallengeId(sheltererId, bundleId)).to.equal(result);
      expect(getChallengeIdStub).to.be.calledWith(sheltererId, bundleId);
      expect(getChallengeIdCallStub).to.be.called;
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
