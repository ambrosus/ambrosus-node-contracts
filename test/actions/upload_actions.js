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
import UploadActions from '../../src/actions/upload_actions';
import {utils} from 'web3';
import {InsufficientFundsToUploadBundleError} from '../../src/errors/errors';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Upload Actions', () => {
  let uploadActions;
  let uploadsWrapperStub;
  let feesWrapperStub;
  let shelteringWrapperStub;
  let blockchainStateWrapperStub;
  let challengesEventEmitterStub;

  const lowBalanceWarningAmount = utils.toWei('10000', 'ether');
  const timestamp = 1544536774;
  const blockNumber = 138;
  const bundleId = '0xABCD';
  const uploadReceipt = {
    blockNumber,
    transactionHash: '0x123'
  };
  const challengeCreatedEvent = {
    ...uploadReceipt,
    returnedValues: {
      bundleId
    }
  };

  beforeEach(() => {
    uploadsWrapperStub = {
      registerBundle: sinon.stub()
    };
    feesWrapperStub = {
      feeForUpload: sinon.stub()
    };
    shelteringWrapperStub = {
      getBundleUploadBlockNumber: sinon.stub()
    };
    blockchainStateWrapperStub = {
      getBlockTimestamp: sinon.stub(),
      getBalance: sinon.stub()
    };
    challengesEventEmitterStub = {
      challenges: sinon.stub()
    };

    uploadActions = new UploadActions(uploadsWrapperStub, feesWrapperStub, shelteringWrapperStub, blockchainStateWrapperStub, challengesEventEmitterStub, lowBalanceWarningAmount);
  });

  describe('uploadBundle', () => {
    let fee;
    const storagePeriods = 2;

    beforeEach(() => {
      fee = utils.toWei('1000', 'ether');
      blockchainStateWrapperStub.getBalance.resolves(utils.toWei('90000', 'ether'));
      feesWrapperStub.feeForUpload.resolves(fee);
      uploadsWrapperStub.registerBundle.resolves(uploadReceipt);
      blockchainStateWrapperStub.getBlockTimestamp.withArgs(blockNumber).resolves(timestamp);
    });

    it('calls registerBundle method of upload wrapper', async () => {
      const uploadResult = await uploadActions.uploadBundle(bundleId, storagePeriods);

      expect(uploadResult).to.deep.equal({...uploadReceipt, timestamp, lowBalanceWarning: false, approximateBalanceAfterUpload: '89000000000000000000000'});
      expect(feesWrapperStub.feeForUpload).to.have.been.calledOnceWith(storagePeriods);
      expect(uploadsWrapperStub.registerBundle).to.have.been.calledOnceWith(
        bundleId,
        fee,
        storagePeriods
      );
    });

    it('returns warning if funds are lower than lowBalanceWarning but still higher than fee', async () => {
      blockchainStateWrapperStub.getBalance.resolves(utils.toWei('5000', 'ether'));

      const uploadResult = await uploadActions.uploadBundle(bundleId, storagePeriods);
      expect(uploadResult).to.deep.equal({
        ...uploadReceipt, timestamp, lowBalanceWarning: true, approximateBalanceAfterUpload: '4000000000000000000000'
      });
    });

    it('calls registerBundle method of upload wrapper if funds are lower than lowBalanceWarning but still higher than fee', async () => {
      blockchainStateWrapperStub.getBalance.resolves(utils.toWei('5000', 'ether'));

      await uploadActions.uploadBundle(bundleId, storagePeriods);
      expect(uploadsWrapperStub.registerBundle).to.have.been.calledOnceWith(
        bundleId,
        fee,
        storagePeriods
      );
    });

    it('returns error when funds are less than fee', async () => {
      blockchainStateWrapperStub.getBalance.resolves(utils.toWei('900', 'ether'));
      await expect(uploadActions.uploadBundle(bundleId, storagePeriods)).to.eventually.be.rejectedWith(InsufficientFundsToUploadBundleError, 'Insufficient funds: need at least 1000 to upload the bundle. Balance: 900');
    });
  });

  describe('getBundleUploadData', () => {
    it('gets block number and returns upload data', async () => {
      shelteringWrapperStub.getBundleUploadBlockNumber.resolves(blockNumber);
      challengesEventEmitterStub.challenges.resolves([challengeCreatedEvent]);
      blockchainStateWrapperStub.getBlockTimestamp.withArgs(blockNumber).resolves(timestamp);

      expect(await uploadActions.getBundleUploadData(bundleId)).to.deep.equal({...uploadReceipt, timestamp});
    });

    it('returns null if bundle was not uploaded', async () => {
      shelteringWrapperStub.getBundleUploadBlockNumber.resolves(null);

      expect(await uploadActions.getBundleUploadData(bundleId)).to.be.null;
    });
  });
});

