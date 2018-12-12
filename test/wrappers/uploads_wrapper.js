/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon, {resetHistory} from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import UploadsWrapper from '../../src/wrappers/uploads_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Uploads Wrapper', () => {
  let uploadsWrapper;

  describe('registerBundle', () => {
    const bundleId = '0xc0ffee';
    const storagePeriods = 23;
    const defaultAccount = '0x123';
    const fee = '100';
    const exampleData = '0xda7a';
    let contractMock;
    let registerBundleStub;
    let registerBundleSendStub;

    before(async () => {
      registerBundleStub = sinon.stub();
      registerBundleSendStub = sinon.stub().resolves(exampleData);
      contractMock = {
        methods: {
          registerBundle: registerBundleStub
        }
      };
      registerBundleStub.returns({
        send: registerBundleSendStub
      });
    });

    afterEach(() => {
      resetHistory(contractMock);
    });

    describe('sendTransactions = true', () => {
      before(() => {
        uploadsWrapper = new UploadsWrapper({}, {}, defaultAccount, true);
        sinon.stub(uploadsWrapper, 'contract').resolves(contractMock);
      });

      it('calls contract method with correct arguments', async () => {
        await uploadsWrapper.registerBundle(bundleId, fee, storagePeriods);
        expect(registerBundleStub).to.be.calledOnceWith(bundleId, storagePeriods);
        expect(registerBundleSendStub).to.be.calledOnceWith({from: defaultAccount, value: fee});
      });
    });
  });

  describe('getUploadData', () => {
    let contractMock;
    const defaultAccount = '0x123';
    const exampleBlockNumber = 3;
    const exampleTxHash = '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385';
    const exampleBundleId = '0xdeadbeef';
    const exampleEvents = [
      {
        returnValues: {
          bundleId: '0x1',
          storagePeriods: '2'
        },
        raw: {
          data: '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385',
          topics: [
            '0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7',
            '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385']
        },
        event: 'BundleUploaded',
        signature: '0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7',
        logIndex: 0,
        transactionIndex: 0,
        transactionHash: '0x123',
        blockHash: '0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7',
        blockNumber: exampleBlockNumber,
        address: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe'
      }, {
        returnValues: {
          bundleId: exampleBundleId,
          storagePeriods: '4'
        },
        raw: {
          data: '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385',
          topics: [
            '0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7',
            '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385']
        },
        event: 'BundleUploaded',
        signature: '0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead8',
        logIndex: 0,
        transactionIndex: 1,
        transactionHash: exampleTxHash,
        blockHash: '0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7',
        blockNumber: exampleBlockNumber,
        address: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe'
      }];

    beforeEach(async () => {
      contractMock = {
        getPastEvents: sinon.stub().resolves(exampleEvents)
      };
      uploadsWrapper = new UploadsWrapper({}, {}, defaultAccount);
      sinon.stub(uploadsWrapper, 'contract').resolves(contractMock);
    });

    it('gets events from block, transaction sender and returns correct data', async () => {
      expect(await uploadsWrapper.getUploadData(exampleBundleId, exampleBlockNumber)).to.deep.equal({
        blockNumber: exampleBlockNumber,
        transactionHash: exampleTxHash
      });
      expect(contractMock.getPastEvents).to.be.calledOnceWith('BundleUploaded', {fromBlock: exampleBlockNumber, toBlock: exampleBlockNumber});
    });

    it('returns null if no events with such bundleId were emitted in that block', async () => {
      contractMock.getPastEvents.resolves([exampleEvents[0]]);
      expect(await uploadsWrapper.getUploadData(exampleBundleId, exampleBlockNumber)).to.be.null;
    });
  });
});
