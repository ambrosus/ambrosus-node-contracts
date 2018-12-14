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
import ShelteringWrapper from '../../src/wrappers/sheltering_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Sheltering Wrapper', () => {
  let shelteringWrapper;

  describe('isSheltering', () => {
    let isShelteringStub;
    let isShelteringCallStub;
    const bundleId = 'bundle';
    const defaultAddress = '0x123';

    beforeEach(async () => {
      isShelteringStub = sinon.stub();
      isShelteringCallStub = sinon.stub();
      const contractMock = {
        methods: {
          isSheltering: isShelteringStub.returns({
            call: isShelteringCallStub.resolves(true)
          })
        }
      };
      shelteringWrapper = new ShelteringWrapper({}, {}, defaultAddress);
      sinon.stub(shelteringWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await shelteringWrapper.isSheltering(bundleId)).to.equal(true);
      expect(isShelteringStub).to.be.calledOnceWith(bundleId, defaultAddress);
      expect(isShelteringCallStub).to.be.calledOnce;
    });
  });

  describe('getBundleUploader', () => {
    let getBundleUploaderStub;
    let getBundleUploaderCallStub;
    const bundleId = 'bundle';

    beforeEach(async () => {
      getBundleUploaderStub = sinon.stub();
      getBundleUploaderCallStub = sinon.stub();
      const contractMock = {
        methods: {
          getBundleUploader: getBundleUploaderStub.returns({
            call: getBundleUploaderCallStub.resolves(4)
          })
        }
      };
      shelteringWrapper = new ShelteringWrapper({}, {}, null);
      sinon.stub(shelteringWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await shelteringWrapper.getBundleUploader(bundleId)).to.equal(4);
      expect(getBundleUploaderStub).to.be.calledOnceWith(bundleId);
      expect(getBundleUploaderCallStub).to.be.calledOnce;
    });
  });

  describe('getBundleUploadBlockNumber', () => {
    let getBundleUploadBlockNumberStub;
    let igetBundleUploadBlockNumberCallStub;
    const bundleId = 'bundle';
    const defaultAddress = '0x123';
    const blockNumber = 23;

    beforeEach(async () => {
      getBundleUploadBlockNumberStub = sinon.stub();
      igetBundleUploadBlockNumberCallStub = sinon.stub();
      const contractMock = {
        methods: {
          getBundleUploadBlockNumber: getBundleUploadBlockNumberStub.returns({
            call: igetBundleUploadBlockNumberCallStub.resolves(`${blockNumber}`)
          })
        }
      };
      shelteringWrapper = new ShelteringWrapper({}, {}, defaultAddress);
      sinon.stub(shelteringWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await shelteringWrapper.getBundleUploadBlockNumber(bundleId)).to.equal(blockNumber);
      expect(getBundleUploadBlockNumberStub).to.be.calledOnceWith(bundleId);
      expect(igetBundleUploadBlockNumberCallStub).to.be.calledOnce;
    });

    it('returns null if upload block number is 0', async () => {
      igetBundleUploadBlockNumberCallStub.resolves('0');
      expect(await shelteringWrapper.getBundleUploadBlockNumber(bundleId)).to.be.null;
    });
  });

  describe('shelteringExpirationDate', () => {
    let shelteringExpirationDateStub;
    let shelteringExpirationDateCallStub;
    const bundleId = 'bundle';
    const expirationDate = 123;
    const defaultAddress = '0x123';

    beforeEach(async () => {
      shelteringExpirationDateStub = sinon.stub();
      shelteringExpirationDateCallStub = sinon.stub();
      const contractMock = {
        methods: {
          getShelteringExpirationDate: shelteringExpirationDateStub.returns({
            call: shelteringExpirationDateCallStub.resolves(expirationDate)
          })
        }
      };
      shelteringWrapper = new ShelteringWrapper({}, {}, defaultAddress);
      sinon.stub(shelteringWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await shelteringWrapper.shelteringExpirationDate(bundleId)).to.equal(expirationDate);
      expect(shelteringExpirationDateStub).to.be.calledOnceWith(bundleId, defaultAddress);
      expect(shelteringExpirationDateCallStub).to.be.calledOnce;
    });
  });
});
