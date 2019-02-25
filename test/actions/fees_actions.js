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
import FeesActions from '../../src/actions/fees_actions';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Fees Actions', () => {
  let feesActions;
  let feesWrapperMock;
  const defaultAddress = '0xBEAF';
  const exampleFee = '12';


  beforeEach(() => {
    feesWrapperMock = {
      getOwner: sinon.stub(),
      defaultAddress,
      setBaseUploadFee: sinon.stub(),
      feeForUpload: sinon.stub(),
      feeForChallenge: sinon.stub(),
      transferOwnership: sinon.stub()
    };

    feesActions = new FeesActions(feesWrapperMock);
  });

  describe('setBaseUploadFee', () => {
    it('check if owner is same as default address and sets fee', async () => {
      feesWrapperMock.getOwner.resolves(defaultAddress);
      await feesActions.setBaseUploadFee(exampleFee);
      expect(feesWrapperMock.getOwner).to.be.calledOnceWith();
      expect(feesWrapperMock.setBaseUploadFee).to.be.calledOnceWith(exampleFee);
    });

    it('throws if sender is not the owner', async () => {
      feesWrapperMock.getOwner.resolves('0x21312');
      await expect(feesActions.setBaseUploadFee(exampleFee)).to.be.rejected;
      expect(feesWrapperMock.setBaseUploadFee).to.be.not.called;
    });
  });

  describe('feeForUpload', () => {
    const storagePeriods = 42;

    it('gets fee from wrapper', async () => {
      feesWrapperMock.feeForUpload.resolves(exampleFee);
      expect(await feesActions.feeForUpload(storagePeriods)).to.equal(exampleFee);
      expect(feesWrapperMock.feeForUpload).to.be.calledOnceWith(storagePeriods);
    });
  });

  describe('feeForChallenge', () => {
    const storagePeriods = 42;
    it('gets fee from wrapper', async () => {
      feesWrapperMock.feeForChallenge.resolves(exampleFee);
      expect(await feesActions.feeForChallenge(storagePeriods)).to.equal(exampleFee);
      expect(feesWrapperMock.feeForChallenge).to.be.calledOnceWith(storagePeriods);
    });
  });

  describe('transferOwnership', () => {
    const newOwnerAddress = '0x12345';

    beforeEach(() => {
      feesWrapperMock.defaultAddress = defaultAddress;
      feesWrapperMock.getOwner.resolves(defaultAddress);
    });

    it(`calls wrapper's transferOwnership method`, async () => {
      await feesActions.transferOwnership(newOwnerAddress);
      expect(feesWrapperMock.transferOwnership).to.be.calledOnceWith(newOwnerAddress);
    });

    it('throws if caller is not the current owner', async () => {
      feesWrapperMock.getOwner.resolves('0x420');
      await expect(feesActions.transferOwnership(newOwnerAddress)).to.be.rejected;
      expect(feesWrapperMock.getOwner).to.be.called;
    });
  });
});
