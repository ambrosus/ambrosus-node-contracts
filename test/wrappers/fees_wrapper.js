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
import FeesWrapper from '../../src/wrappers/fees_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Fees Wrapper', () => {
  let feesWrapper;

  describe('getOwner', () => {
    let getOwnerStub;
    let getOwnerCallStub;
    const ownerAddress = '0x1234ABCD';

    before(async () => {
      getOwnerStub = sinon.stub();
      getOwnerCallStub = sinon.stub();
      const contractMock = {
        methods: {
          owner: getOwnerStub.returns({
            call: getOwnerCallStub.resolves(ownerAddress)
          })
        }
      };
      feesWrapper = new FeesWrapper();
      sinon.stub(feesWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await expect(feesWrapper.getOwner()).to.eventually.equal(ownerAddress);
      expect(getOwnerStub).to.be.calledOnce;
      expect(getOwnerCallStub).to.be.calledOnce;
    });
  });

  describe('setBaseUploadFee', () => {
    const exampleFee = '100';
    let contractMock;
    let setBaseUploadFeeStub;
    let setBaseUploadFeeSendStub;
    const defaultAddress = '0x6789';
    const exampleData = '0xda7a';
    const encodeAbiStub = sinon.stub().resolves(exampleData);

    before(() => {
      setBaseUploadFeeStub = sinon.stub();
      setBaseUploadFeeSendStub = sinon.stub().resolves();

      contractMock = {
        methods: {
          setBaseUploadFee: setBaseUploadFeeStub.returns({
            send: setBaseUploadFeeSendStub.resolves(),
            encodeABI: encodeAbiStub
          })
        }
      };
    });

    afterEach(() => {
      resetHistory(contractMock);
    });

    describe('sendTransactions = true', () => {
      before(() => {
        feesWrapper = new FeesWrapper({}, {}, defaultAddress, true);
        sinon.stub(feesWrapper, 'contract').resolves(contractMock);
      });

      it('calls contract method with correct arguments ', async () => {
        await feesWrapper.setBaseUploadFee(exampleFee);
        expect(setBaseUploadFeeStub).to.be.calledWith(exampleFee);
        expect(setBaseUploadFeeSendStub).to.be.calledOnceWith({from: defaultAddress});
      });
    });

    describe('sendTransactions = false', () => {
      before(() => {
        feesWrapper = new FeesWrapper({}, {}, defaultAddress, false);
        sinon.stub(feesWrapper, 'contract').resolves(contractMock);
      });

      it('returns data', async () => {
        expect(await feesWrapper.setBaseUploadFee(exampleFee)).to.equal(exampleData);
        expect(setBaseUploadFeeStub).to.be.calledWith(exampleFee);
        expect(setBaseUploadFeeSendStub).to.be.not.called;
        expect(encodeAbiStub).to.be.calledOnceWith();
      });
    });
  });

  describe('feeForUpload', () => {
    const storagePeriods = 23;
    const fee = '100';
    let getFeeForUploadStub;
    let getFeeForUploadCallStub;

    beforeEach(async () => {
      getFeeForUploadStub = sinon.stub();
      getFeeForUploadCallStub = sinon.stub();
      const contractMock = {
        methods: {
          getFeeForUpload: getFeeForUploadStub
        }
      };
      getFeeForUploadStub.returns({
        call: getFeeForUploadCallStub.resolves(fee)
      });
      feesWrapper = new FeesWrapper({}, {}, null);
      sinon.stub(feesWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await feesWrapper.feeForUpload(storagePeriods)).to.equal(fee);
      expect(getFeeForUploadStub).to.be.calledOnceWith(storagePeriods);
      expect(getFeeForUploadCallStub).to.be.calledOnce;
    });
  });
});
