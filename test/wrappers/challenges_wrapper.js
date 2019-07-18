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
import ChallengeWrapper from '../../src/wrappers/challenge_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Challenge Wrapper', () => {
  let challengeWrapper;
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
      challengeWrapper = new ChallengeWrapper({}, web3Mock, defaultAddress);
    });

    it('computes earliest block', async () => {
      expect(await challengeWrapper.earliestMeaningfulBlock(challengeDuration)).to.equal(1683085); // 1752205 - 4 * 24 * 60 * 60 / 5
    });

    it('returns 0 when block count is too small for any challenge to expire', async () => {
      web3Mock.eth.getBlockNumber.resolves(10);
      expect(await challengeWrapper.earliestMeaningfulBlock(challengeDuration)).to.equal(0);
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
      challengeWrapper = new ChallengeWrapper({}, {}, defaultAddress);
      sinon.stub(challengeWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await challengeWrapper.resolve(challengeId);
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
      challengeWrapper = new ChallengeWrapper({}, {}, defaultAddress);
      sinon.stub(challengeWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await challengeWrapper.start(sheltererId, bundleId, fee);
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
      challengeWrapper = new ChallengeWrapper({}, {}, defaultAddress);
      sinon.stub(challengeWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await challengeWrapper.markAsExpired(challengeId);
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
      challengeWrapper = new ChallengeWrapper({}, {}, defaultAddress);
      sinon.stub(challengeWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await challengeWrapper.challengeIsTimedOut(challengeId)).to.equal(result);
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
      challengeWrapper = new ChallengeWrapper({}, {}, defaultAddress);
      sinon.stub(challengeWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await challengeWrapper.canResolve(challengeId)).to.equal(result);
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
      challengeWrapper = new ChallengeWrapper();
      sinon.stub(challengeWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await challengeWrapper.getChallengeId(sheltererId, bundleId)).to.equal(result);
      expect(getChallengeIdStub).to.be.calledWith(sheltererId, bundleId);
      expect(getChallengeIdCallStub).to.be.called;
    });
  });

  describe('isInProgress', () => {
    const challengeId = '0x123';
    const result = 'res';
    let requestIsInProgressStub;
    let requestIsInProgressCallStub;

    beforeEach(async () => {
      requestIsInProgressStub = sinon.stub();
      requestIsInProgressCallStub = sinon.stub().resolves(result);
      const contractMock = {
        methods: {
          requestIsInProgress: requestIsInProgressStub
        }
      };
      requestIsInProgressStub.returns({
        call: requestIsInProgressCallStub
      });
      challengeWrapper = new ChallengeWrapper();
      sinon.stub(challengeWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await challengeWrapper.isInProgress(challengeId)).to.equal(result);
      expect(requestIsInProgressStub).to.be.calledWith(challengeId);
      expect(requestIsInProgressCallStub).to.be.called;
    });
  });

  describe('getChallengeCreationTime', () => {
    const challengeId = '0x123';
    const result = '16012361';
    let getRequestCreationTimeStub;
    let getRequestCreationTimeCallStub;

    beforeEach(async () => {
      getRequestCreationTimeStub = sinon.stub();
      getRequestCreationTimeCallStub = sinon.stub().resolves(result);
      const contractMock = {
        methods: {
          getRequestCreationTime: getRequestCreationTimeStub
        }
      };
      getRequestCreationTimeStub.returns({
        call: getRequestCreationTimeCallStub
      });
      challengeWrapper = new ChallengeWrapper();
      sinon.stub(challengeWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await challengeWrapper.getChallengeCreationTime(challengeId)).to.equal(result);
      expect(getRequestCreationTimeStub).to.be.calledWith(challengeId);
      expect(getRequestCreationTimeCallStub).to.be.called;
    });
  });
});
