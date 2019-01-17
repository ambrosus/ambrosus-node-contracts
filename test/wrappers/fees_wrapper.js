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
import FeesWrapper from '../../src/wrappers/fees_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Fees Wrapper', () => {
  let feesWrapper;
  const defaultAddress = '0x6789';

  describe('setBaseUploadFee', () => {
    const exampleFee = '100';
    let contractMock;
    let setBaseUploadFeeStub;
    let setBaseUploadFeeSendStub;

    before(() => {
      setBaseUploadFeeStub = sinon.stub();
      setBaseUploadFeeSendStub = sinon.stub().resolves();

      contractMock = {
        methods: {
          setBaseUploadFee: setBaseUploadFeeStub.returns({
            send: setBaseUploadFeeSendStub.resolves()
          })
        }
      };

      feesWrapper = new FeesWrapper({}, {}, defaultAddress);
      sinon.stub(feesWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments ', async () => {
      await feesWrapper.setBaseUploadFee(exampleFee);
      expect(setBaseUploadFeeStub).to.be.calledWith(exampleFee);
      expect(setBaseUploadFeeSendStub).to.be.calledOnceWith({from: defaultAddress});
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

  describe('feeForChallenge', () => {
    const storagePeriods = 23;
    const fee = '100';
    let getFeeForChallengeStub;
    let getFeeForChallengeCallStub;

    beforeEach(async () => {
      getFeeForChallengeStub = sinon.stub();
      getFeeForChallengeCallStub = sinon.stub();
      const contractMock = {
        methods: {
          getFeeForChallenge: getFeeForChallengeStub
        }
      };
      getFeeForChallengeStub.returns({
        call: getFeeForChallengeCallStub.resolves(fee)
      });
      feesWrapper = new FeesWrapper({}, {}, null);
      sinon.stub(feesWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await feesWrapper.feeForChallenge(storagePeriods)).to.equal(fee);
      expect(getFeeForChallengeStub).to.be.calledOnceWith(storagePeriods);
      expect(getFeeForChallengeCallStub).to.be.calledOnce;
    });
  });
});
