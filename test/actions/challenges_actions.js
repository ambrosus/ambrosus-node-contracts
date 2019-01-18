/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import ChallengesActions from '../../src/actions/challenges_actions';
import {InsufficientFundsToStartChallengeError} from '../../src/errors/errors';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Challenges actions', () => {
  let challengesActions;
  let mockChallengesWrapper;
  let mockFeesWrapper;
  let mockShelteringWrapper;
  let mockBlockchainStateWrapper;
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
      mockChallengesWrapper = {
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
      mockChallengesWrapper.start.withArgs(exampleSheltererId, exampleBundleId).resolves(exampleTxResult);
      mockChallengesWrapper.getChallengeId.withArgs(exampleSheltererId, exampleBundleId).resolves(exampleChallengeId);
      mockChallengesWrapper.isInProgress.withArgs(exampleChallengeId).resolves(false);
      mockShelteringWrapper.isSheltering.withArgs(exampleBundleId, exampleSheltererId).resolves(true);
      mockFeesWrapper.feeForChallenge.withArgs(exampleStoragePeriods).resolves(exampleFee);
      mockBlockchainStateWrapper.getBalance.withArgs(defaultAddress).resolves(exampleBalance);
      mockShelteringWrapper.bundleStoragePeriods.withArgs(exampleBundleId).resolves(exampleStoragePeriods);

      challengesActions = new ChallengesActions(mockChallengesWrapper, mockFeesWrapper, mockShelteringWrapper, mockBlockchainStateWrapper);
    });

    it('calls start method of wrapper, returns correct data', async () => {
      expect(await challengesActions.startChallenge(exampleSheltererId, exampleBundleId)).to.deep.equal({
        ...exampleTxResult,
        challengeId: exampleChallengeId
      });
      expect(mockChallengesWrapper.start).to.be.calledOnceWith(exampleSheltererId, exampleBundleId);
    });

    it('throws and does not perform transaction if bundle is not sheltered by this shelterer', async () => {
      mockShelteringWrapper.isSheltering.withArgs(exampleBundleId, exampleSheltererId).resolves(false);
      await expect(challengesActions.startChallenge(exampleSheltererId, exampleBundleId)).to.be.rejectedWith('0xc0ffee is not holding 0xbeef');
      expect(mockChallengesWrapper.start).to.be.not.called;
    });

    it('throws and does not perform transaction if challenge with same id is already in progress', async () => {
      mockChallengesWrapper.isInProgress.withArgs(exampleChallengeId).resolves(true);
      await expect(challengesActions.startChallenge(exampleSheltererId, exampleBundleId)).to.be.rejectedWith('Could not start a challenge: same challenge is currently in progress');
      expect(mockChallengesWrapper.start).to.be.not.called;
    });

    it('throws and does not perform transaction if funds are insufficient', async () => {
      mockBlockchainStateWrapper.getBalance.withArgs(defaultAddress).resolves('10');
      await expect(challengesActions.startChallenge(exampleSheltererId, exampleBundleId)).to.be.rejectedWith(InsufficientFundsToStartChallengeError, 'Insufficient funds: need at least 0.0000000000000001 to start a challenge. Balance: 0.00000000000000001');
      expect(mockChallengesWrapper.start).to.be.not.called;
    });
  });

  describe('Marking as expired', () => {
    beforeEach(() => {
      mockChallengesWrapper = {
        isInProgress: sinon.stub(),
        challengeIsTimedOut: sinon.stub(),
        markAsExpired: sinon.stub()
      };
      mockChallengesWrapper.isInProgress.withArgs(exampleChallengeId).resolves(true);
      mockChallengesWrapper.challengeIsTimedOut.withArgs(exampleChallengeId).resolves(true);
      mockChallengesWrapper.markAsExpired.withArgs(exampleChallengeId).resolves(exampleTxResult);

      challengesActions = new ChallengesActions(mockChallengesWrapper);
    });

    it('calls markAsExpired method of wrapper', async () => {
      expect(await challengesActions.markAsExpired(exampleChallengeId)).to.equal(exampleTxResult);
      expect(mockChallengesWrapper.isInProgress).to.be.calledOnceWith(exampleChallengeId);
    });

    it('throws when challenge is not in progress', async () => {
      mockChallengesWrapper.isInProgress.withArgs(exampleChallengeId).resolves(false);
      await expect(challengesActions.markAsExpired(exampleChallengeId)).to.be.rejectedWith('Challenge 0x12345 not found');
    });

    it('throws when challenge is not timed out', async () => {
      mockChallengesWrapper.challengeIsTimedOut.withArgs(exampleChallengeId).resolves(false);
      await expect(challengesActions.markAsExpired(exampleChallengeId)).to.be.rejectedWith('Challenge 0x12345 cannot be marked as expired yet');
    });
  });

  describe('Challenge status', () => {
    beforeEach(() => {
      mockChallengesWrapper = {
        isInProgress: sinon.stub(),
        challengeIsTimedOut: sinon.stub(),
        canResolve: sinon.stub()
      };
      mockChallengesWrapper.isInProgress.withArgs(exampleChallengeId).resolves(true);
      mockChallengesWrapper.challengeIsTimedOut.withArgs(exampleChallengeId).resolves(true);
      mockChallengesWrapper.canResolve.withArgs(exampleChallengeId).resolves(false);

      challengesActions = new ChallengesActions(mockChallengesWrapper);
    });

    it('ignores challenge status when it is not in progress', async () => {
      mockChallengesWrapper.isInProgress.withArgs(exampleChallengeId).resolves(false);
      expect(await challengesActions.challengeStatus(exampleChallengeId)).to.deep.equal({isInProgress: false});
      expect(mockChallengesWrapper.challengeIsTimedOut).to.be.not.called;
      expect(mockChallengesWrapper.canResolve).to.be.not.called;
    });

    it('when challenge is in progress, returns resolution and timeout statuses', async () => {
      expect(await challengesActions.challengeStatus(exampleChallengeId)).to.deep.equal({
        isInProgress: true,
        canResolve: false,
        isTimedOut: true
      });
    });
  });
});
