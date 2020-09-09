/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import UploadsWrapper from '../../src/wrappers/uploads_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Uploads Wrapper', () => {
  let uploadsWrapper;

  describe('registerBundle', () => {
    const bundleId = '0xc0ffee';
    const storagePeriods = 23;
    const defaultAccount = '0x123';
    const fee = '100';
    const blockNumber = 1267;
    const transactionHash = '0x55434';
    const exampleData = {blockNumber, transactionHash};
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
      uploadsWrapper = new UploadsWrapper({}, {}, defaultAccount);
      sinon.stub(uploadsWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      const receipt = await uploadsWrapper.registerBundle(bundleId, fee, storagePeriods);
      expect(receipt.blockNumber).to.equal(blockNumber);
      expect(receipt.transactionHash).to.equal(transactionHash);
      expect(registerBundleStub).to.be.calledOnceWith(bundleId, storagePeriods);
      expect(registerBundleSendStub).to.be.calledOnceWith({from: defaultAccount, value: fee});
    });
  });
});
