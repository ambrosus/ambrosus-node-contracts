/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BN from 'bn.js';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import UploadActions from '../../src/actions/upload_actions';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Upload Actions', () => {
  let uploadActions;
  let uploadsWrapperStub;
  let feesWrapperStub;
  let shelteringWrapperStub;
  let blockchainStateWrapperStub;
  const timestamp = 1544536774;
  const blockNumber = 138;
  const bundleId = '0xABCD';
  const uploadReceipt = {
    blockNumber,
    transactionHash: '0x123'
  };

  beforeEach(() => {
    uploadsWrapperStub = {
      registerBundle: sinon.stub(),
      getUploadData: sinon.stub()
    };
    feesWrapperStub = {
      feeForUpload: sinon.stub()
    };
    shelteringWrapperStub = {
      getBundleUploadBlockNumber: sinon.stub()
    };
    blockchainStateWrapperStub = {
      getBlockTimestamp: sinon.stub()
    };
    uploadActions = new UploadActions(uploadsWrapperStub, feesWrapperStub, shelteringWrapperStub, blockchainStateWrapperStub);
  });

  it('uploadBundle', async () => {
    const storagePeriods = 2;
    const fee = new BN(12345);

    feesWrapperStub.feeForUpload.resolves(fee);
    uploadsWrapperStub.registerBundle.resolves(uploadReceipt);
    blockchainStateWrapperStub.getBlockTimestamp.withArgs(blockNumber).resolves(timestamp);

    const uploadResult = await uploadActions.uploadBundle(bundleId, storagePeriods);

    expect(uploadResult).to.deep.equal({...uploadReceipt, timestamp});
    expect(feesWrapperStub.feeForUpload).to.have.been.calledOnceWith(storagePeriods);
    expect(uploadsWrapperStub.registerBundle).to.have.been.calledOnceWith(
      bundleId,
      fee,
      storagePeriods
    );
  });

  describe('getBundleUploadData', () => {

    it('gets block number and returns upload data', async () => {
      shelteringWrapperStub.getBundleUploadBlockNumber.resolves(blockNumber);
      uploadsWrapperStub.getUploadData.resolves(uploadReceipt);
      blockchainStateWrapperStub.getBlockTimestamp.withArgs(blockNumber).resolves(timestamp);

      expect(await uploadActions.getBundleUploadData(bundleId)).to.deep.equal({...uploadReceipt, timestamp});
    });

    it('returns null if bundle was not uploaded', async () => {
      shelteringWrapperStub.getBundleUploadBlockNumber.resolves(null);

      expect(await uploadActions.getBundleUploadData(bundleId)).to.be.null;
    });
  });
});

