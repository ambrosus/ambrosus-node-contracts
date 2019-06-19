/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import ChallengeActions from '../../src/actions/challenge_actions';
import {InsufficientFundsToStartChallengeError} from '../../src/errors/errors';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Challenge actions', () => {
  let challengeActions;
  let mockChallengeWrapper;
  let mockFeesWrapper;
  let mockShelteringWrapper;
  let mockBlockchainStateWrapper;
  let mockAtlasStakeStoreWrapper;
  const exampleChallengeId = '0x12345';
  const exampleTxResult = {
    blockNumber: 100,
    transactionHash: '0x9876'
  };

  describe('Starting challenge', () => {
    const exampleSheltererId = '0xc0ffee';
    const exampleBundleId = '0xbeef';
    const exampleFee = '100';
    const exampleBalance = '200';
    const exampleStoragePeriods = '23';
    const defaultAddress = '0xADD';

    beforeEach(() => {
      mockChallengeWrapper = {
        start: sinon.stub(),
        getChallengeId: sinon.stub(),
        isInProgress: sinon.stub(),
        defaultAddress
      };
      mockFeesWrapper = {
        feeForChallenge: sinon.stub()
      };
      mockBlockchainStateWrapper = {
        getBalance: sinon.stub()
      };
      mockShelteringWrapper = {
        isSheltering: sinon.stub(),
        bundleStoragePeriods: sinon.stub()
      };
      mockChallengeWrapper.start.withArgs(exampleSheltererId, exampleBundleId).resolves(exampleTxResult);
      mockChallengeWrapper.getChallengeId.withArgs(exampleSheltererId, exampleBundleId).resolves(exampleChallengeId);
      mockChallengeWrapper.isInProgress.withArgs(exampleChallengeId).resolves(false);
      mockShelteringWrapper.isSheltering.withArgs(exampleBundleId, exampleSheltererId).resolves(true);
      mockFeesWrapper.feeForChallenge.withArgs(exampleStoragePeriods).resolves(exampleFee);
      mockBlockchainStateWrapper.getBalance.withArgs(defaultAddress).resolves(exampleBalance);
      mockShelteringWrapper.bundleStoragePeriods.withArgs(exampleBundleId).resolves(exampleStoragePeriods);

      challengeActions = new ChallengeActions(mockChallengeWrapper, mockFeesWrapper, mockShelteringWrapper, mockBlockchainStateWrapper);
    });

    it('calls start method of wrapper, returns correct data', async () => {
      expect(await challengeActions.startChallenge(exampleSheltererId, exampleBundleId)).to.deep.equal({
        ...exampleTxResult,
        challengeId: exampleChallengeId
      });
      expect(mockChallengeWrapper.start).to.be.calledOnce;
    });

    it('throws and does not perform transaction if bundle is not sheltered by this shelterer', async () => {
      mockShelteringWrapper.isSheltering.withArgs(exampleBundleId, exampleSheltererId).resolves(false);
      await expect(challengeActions.startChallenge(exampleSheltererId, exampleBundleId)).to.be.rejectedWith('0xc0ffee is not sherltering 0xbeef');
      expect(mockChallengeWrapper.start).to.be.not.called;
    });

    it('throws and does not perform transaction if challenge with same id is already in progress', async () => {
      mockChallengeWrapper.isInProgress.withArgs(exampleChallengeId).resolves(true);
      await expect(challengeActions.startChallenge(exampleSheltererId, exampleBundleId)).to.be.rejectedWith('Could not start a challenge: same challenge is currently in progress');
      expect(mockChallengeWrapper.start).to.be.not.called;
    });

    it('throws and does not perform transaction if funds are insufficient', async () => {
      mockBlockchainStateWrapper.getBalance.withArgs(defaultAddress).resolves('10');
      await expect(challengeActions.startChallenge(exampleSheltererId, exampleBundleId)).to.be.rejectedWith(InsufficientFundsToStartChallengeError, 'Insufficient funds: need at least 0.0000000000000001 to start a challenge. Balance: 0.00000000000000001');
      expect(mockChallengeWrapper.start).to.be.not.called;
    });
  });

  describe('Marking as expired', () => {
    beforeEach(() => {
      mockChallengeWrapper = {
        isInProgress: sinon.stub(),
        challengeIsTimedOut: sinon.stub(),
        markAsExpired: sinon.stub()
      };
      mockChallengeWrapper.isInProgress.withArgs(exampleChallengeId).resolves(true);
      mockChallengeWrapper.challengeIsTimedOut.withArgs(exampleChallengeId).resolves(true);
      mockChallengeWrapper.markAsExpired.withArgs(exampleChallengeId).resolves(exampleTxResult);

      challengeActions = new ChallengeActions(mockChallengeWrapper);
    });

    it('calls markAsExpired method of wrapper', async () => {
      expect(await challengeActions.markAsExpired(exampleChallengeId)).to.equal(exampleTxResult);
      expect(mockChallengeWrapper.isInProgress).to.be.calledOnceWith(exampleChallengeId);
    });

    it('throws when challenge is not in progress', async () => {
      mockChallengeWrapper.isInProgress.withArgs(exampleChallengeId).resolves(false);
      await expect(challengeActions.markAsExpired(exampleChallengeId)).to.be.rejectedWith('Challenge 0x12345 not found');
    });

    it('throws when challenge is not timed out', async () => {
      mockChallengeWrapper.challengeIsTimedOut.withArgs(exampleChallengeId).resolves(false);
      await expect(challengeActions.markAsExpired(exampleChallengeId)).to.be.rejectedWith('Challenge 0x12345 cannot be marked as expired');
    });
  });

  describe('Challenge status', () => {
    beforeEach(() => {
      mockChallengeWrapper = {
        isInProgress: sinon.stub(),
        challengeIsTimedOut: sinon.stub(),
        canResolve: sinon.stub()
      };
      mockChallengeWrapper.isInProgress.withArgs(exampleChallengeId).resolves(true);
      mockChallengeWrapper.challengeIsTimedOut.withArgs(exampleChallengeId).resolves(true);
      mockChallengeWrapper.canResolve.withArgs(exampleChallengeId).resolves(false);

      challengeActions = new ChallengeActions(mockChallengeWrapper);
    });

    it('ignores challenge status when it is not in progress', async () => {
      mockChallengeWrapper.isInProgress.withArgs(exampleChallengeId).resolves(false);
      expect(await challengeActions.challengeStatus(exampleChallengeId)).to.deep.equal({isInProgress: false});
      expect(mockChallengeWrapper.challengeIsTimedOut).to.be.not.called;
      expect(mockChallengeWrapper.canResolve).to.be.not.called;
    });

    it('when challenge is in progress, returns resolution and timeout statuses', async () => {
      expect(await challengeActions.challengeStatus(exampleChallengeId)).to.deep.equal({
        isInProgress: true,
        canResolve: false,
        isTimedOut: true
      });
    });
  });

  describe('Next penalty for a node', () => {
    const exampleNode = '0x12356';
    const basicStake = '75000000000000000000000';
    const penaltiesHistory = {
      lastPenaltyTime: '1560862350',
      penaltiesCount: '5'
    };
    const examplePenaltyInfo = {
      penalty: '1000000000',
      newPenaltiesCount: '1'
    };

    beforeEach(() => {
      mockAtlasStakeStoreWrapper = {
        getPenaltiesHistory: sinon.stub(),
        getBasicStake: sinon.stub().resolves('0')
      };
      mockFeesWrapper = {
        getPenalty: sinon.stub()
      };
      mockAtlasStakeStoreWrapper.getPenaltiesHistory.withArgs(exampleNode).resolves(penaltiesHistory);
      mockAtlasStakeStoreWrapper.getBasicStake.withArgs(exampleNode).resolves(basicStake);
      mockFeesWrapper.getPenalty.withArgs(basicStake, penaltiesHistory.penaltiesCount, penaltiesHistory.lastPenaltyTime).resolves(examplePenaltyInfo);
      challengeActions = new ChallengeActions({}, mockFeesWrapper, {}, {}, mockAtlasStakeStoreWrapper);
    });

    it('returns next penalty for node', async () => {
      expect(await challengeActions.nextPenalty(exampleNode)).to.equal(examplePenaltyInfo.penalty);
    });

    it('throws if node is not an Atlas', async () => {
      await expect(challengeActions.nextPenalty('otherNode')).to.be.rejectedWith('Node otherNode is not onboarded as an ATLAS');
    });
  });
});
