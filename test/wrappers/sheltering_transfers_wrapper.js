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
import ShelteringTransfersWrapper from '../../src/wrappers/sheltering_transfers_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('ShelteringTransfers Wrapper', () => {
  let shelteringTransfersWrapper;
  const defaultAddress = '0xdeadface';

  describe('resolve', () => {
    const transferId = '0x123';
    let resolveTransferStub;
    let resolveTransferSendStub;
    let contractMock;

    beforeEach(async () => {
      resolveTransferStub = sinon.stub();
      resolveTransferSendStub = sinon.stub();
      resolveTransferStub.returns({
        send: resolveTransferSendStub
      });
      contractMock = {
        methods: {
          resolve: resolveTransferStub
        }
      };
      shelteringTransfersWrapper = new ShelteringTransfersWrapper({}, {}, defaultAddress);
      sinon.stub(shelteringTransfersWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await shelteringTransfersWrapper.resolve(transferId);
      expect(resolveTransferStub).to.be.calledWith(transferId);
      expect(resolveTransferSendStub).to.be.calledWith({from: defaultAddress});
    });
  });

  describe('start', () => {
    const bundleId = '0xbeef';
    let startTransferStub;
    let startTransferSendStub;
    let contractMock;

    beforeEach(() => {
      startTransferStub = sinon.stub();
      startTransferSendStub = sinon.stub();
      startTransferStub.returns({
        send: startTransferSendStub
      });
      contractMock = {
        methods: {
          start: startTransferStub
        }
      };
      shelteringTransfersWrapper = new ShelteringTransfersWrapper({}, {}, defaultAddress);
      sinon.stub(shelteringTransfersWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await shelteringTransfersWrapper.start(bundleId);
      expect(startTransferStub).to.be.calledWith(bundleId);
      expect(startTransferSendStub).to.be.calledWith({from: defaultAddress});
    });
  });

  describe('cancel', () => {
    const transferId = '0xc0ffee';
    let cancelStub;
    let cancelSendStub;
    let contractMock;

    beforeEach(() => {
      cancelStub = sinon.stub();
      cancelSendStub = sinon.stub();
      cancelStub.returns({
        send: cancelSendStub
      });
      contractMock = {
        methods: {
          cancel: cancelStub
        }
      };
      shelteringTransfersWrapper = new ShelteringTransfersWrapper({}, {}, defaultAddress);
      sinon.stub(shelteringTransfersWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await shelteringTransfersWrapper.cancel(transferId);
      expect(cancelStub).to.be.calledWith(transferId);
      expect(cancelSendStub).to.be.calledWith({from: defaultAddress});
    });
  });

  describe('canResolve', () => {
    const transferId = '0x123';
    const defaultAddress = '0x123';
    const result = 'res';
    let canResolveStub;
    let canResolveCallStub;

    beforeEach(async () => {
      canResolveStub = sinon.stub();
      canResolveCallStub = sinon.stub().resolves(result);
      canResolveStub.returns({
        call: canResolveCallStub
      });
      const contractMock = {
        methods: {
          canResolve: canResolveStub
        }
      };
      shelteringTransfersWrapper = new ShelteringTransfersWrapper({}, {}, defaultAddress);
      sinon.stub(shelteringTransfersWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await shelteringTransfersWrapper.canResolve(transferId)).to.equal(result);
      expect(canResolveStub).to.be.calledWith(defaultAddress, transferId);
      expect(canResolveCallStub).to.be.called;
    });
  });

  describe('getTransferId', () => {
    const sheltererId = '0xc0ffee';
    const bundleId = '0xbeef';
    const result = 'res';
    let getTransferIdStub;
    let getTransferIdCallStub;

    beforeEach(async () => {
      getTransferIdStub = sinon.stub();
      getTransferIdCallStub = sinon.stub().resolves(result);
      getTransferIdStub.returns({
        call: getTransferIdCallStub
      });
      const contractMock = {
        methods: {
          getTransferId: getTransferIdStub
        }
      };
      shelteringTransfersWrapper = new ShelteringTransfersWrapper();
      sinon.stub(shelteringTransfersWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await shelteringTransfersWrapper.getTransferId(sheltererId, bundleId)).to.equal(result);
      expect(getTransferIdStub).to.be.calledWith(sheltererId, bundleId);
      expect(getTransferIdCallStub).to.be.called;
    });
  });

  describe('isInProgress', () => {
    const transferId = '0x123';
    const result = 'res';
    let isInProgressStub;
    let isInProgressCallStub;

    beforeEach(async () => {
      isInProgressStub = sinon.stub();
      isInProgressCallStub = sinon.stub().resolves(result);
      const contractMock = {
        methods: {
          isInProgress: isInProgressStub
        }
      };
      isInProgressStub.returns({
        call: isInProgressCallStub
      });
      shelteringTransfersWrapper = new ShelteringTransfersWrapper();
      sinon.stub(shelteringTransfersWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await shelteringTransfersWrapper.isInProgress(transferId)).to.equal(result);
      expect(isInProgressStub).to.be.calledWith(transferId);
      expect(isInProgressCallStub).to.be.called;
    });
  });

  describe('getTransferCreationTime', () => {
    const transferId = '0x123';
    const result = '16012361';
    let getCreationTimeStub;
    let getCreationTimeCallStub;

    beforeEach(async () => {
      getCreationTimeStub = sinon.stub();
      getCreationTimeCallStub = sinon.stub().resolves(result);
      const contractMock = {
        methods: {
          getCreationTime: getCreationTimeStub
        }
      };
      getCreationTimeStub.returns({
        call: getCreationTimeCallStub
      });
      shelteringTransfersWrapper = new ShelteringTransfersWrapper();
      sinon.stub(shelteringTransfersWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await shelteringTransfersWrapper.getTransferCreationTime(transferId)).to.equal(result);
      expect(getCreationTimeStub).to.be.calledWith(transferId);
      expect(getCreationTimeCallStub).to.be.called;
    });
  });

  describe('getDonor', () => {
    const transferId = '0x123';
    const result = 'donorId';
    let getDonorStub;
    let getDonorCallStub;

    beforeEach(async () => {
      getDonorStub = sinon.stub();
      getDonorCallStub = sinon.stub().resolves(result);
      const contractMock = {
        methods: {
          getDonor: getDonorStub
        }
      };
      getDonorStub.returns({
        call: getDonorCallStub
      });
      shelteringTransfersWrapper = new ShelteringTransfersWrapper();
      sinon.stub(shelteringTransfersWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await shelteringTransfersWrapper.getDonor(transferId)).to.equal(result);
      expect(getDonorStub).to.be.calledWith(transferId);
      expect(getDonorCallStub).to.be.called;
    });
  });

  describe('getTransferredBundle', () => {
    const transferId = '0x123';
    const result = 'bundleId';
    let getBundleStub;
    let getBundleCallStub;

    beforeEach(async () => {
      getBundleStub = sinon.stub();
      getBundleCallStub = sinon.stub().resolves(result);
      const contractMock = {
        methods: {
          getBundle: getBundleStub
        }
      };
      getBundleStub.returns({
        call: getBundleCallStub
      });
      shelteringTransfersWrapper = new ShelteringTransfersWrapper();
      sinon.stub(shelteringTransfersWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await shelteringTransfersWrapper.getTransferredBundle(transferId)).to.equal(result);
      expect(getBundleStub).to.be.calledWith(transferId);
      expect(getBundleCallStub).to.be.called;
    });
  });

  describe('getTransferDesignatedShelterer', () => {
    const transferId = '0x123';
    const result = 'sheltererId';
    let getDesignatedSheltererStub;
    let getDesignatedSheltererCallStub;

    beforeEach(async () => {
      getDesignatedSheltererStub = sinon.stub();
      getDesignatedSheltererCallStub = sinon.stub().resolves(result);
      const contractMock = {
        methods: {
          getDesignatedShelterer: getDesignatedSheltererStub
        }
      };
      getDesignatedSheltererStub.returns({
        call: getDesignatedSheltererCallStub
      });
      shelteringTransfersWrapper = new ShelteringTransfersWrapper();
      sinon.stub(shelteringTransfersWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await shelteringTransfersWrapper.getTransferDesignatedShelterer(transferId)).to.equal(result);
      expect(getDesignatedSheltererStub).to.be.calledWith(transferId);
      expect(getDesignatedSheltererCallStub).to.be.called;
    });
  });
});
