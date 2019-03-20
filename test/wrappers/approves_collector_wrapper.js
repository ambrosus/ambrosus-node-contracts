/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon, {resetHistory} from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import ApprovesCollectorWrapper from '../../src/wrappers/approve_collector_wrapper.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Approves Collector Wrapper', () => {
  const defaultAddress = '0x6789';
  const testUser = '0x1234';
  const testContract = '0x3456';
  const testTransaction = {0:'0x0000000000000000000000000000000000000000', 1:'0xdeadbeef'};
  const testTransactionInfo = {0:'0x0000000000000000000000000000000000000000', 1:'0xdeadbeef', 2:'2', 3:'0'};
  const transactionId = '0x409780f9aaa9ccb5fd6f7aa506a830e24582101dac6f7adc73d53f1a9f49c646';

  describe('addTransaction', () => {
    let addTransactionStub;
    let addTransactionSendStub;
    let contractMock;
    let approvesCollectorWrapper;

    before(async () => {
      addTransactionStub = sinon.stub();
      addTransactionSendStub = sinon.stub();
      contractMock = {
        methods: {
          executeTransaction: addTransactionStub.returns({
            send: addTransactionSendStub.resolves(transactionId)
          })
        }
      };

      approvesCollectorWrapper = new ApprovesCollectorWrapper({}, {}, defaultAddress);
      sinon.stub(approvesCollectorWrapper, 'contract').resolves(contractMock);
    });

    afterEach(() => {
      resetHistory(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      const ret = await approvesCollectorWrapper.addTransaction(testTransaction['0'], testTransaction['1']);
      expect(addTransactionStub).to.be.calledWith(testTransaction['0'], testTransaction['1']);
      expect(addTransactionSendStub).to.be.calledOnceWith({from: defaultAddress});
      expect(ret).to.equal(transactionId);
    });
  });

  describe('approveTransaction', () => {
    let approveTransactionStub;
    let approveTransactionSendStub;
    let contractMock;
    let approvesCollectorWrapper;

    before(async () => {
      approveTransactionStub = sinon.stub();
      approveTransactionSendStub = sinon.stub();
      contractMock = {
        methods: {
          approveTransaction: approveTransactionStub.returns({
            send: approveTransactionSendStub.resolves()
          })
        }
      };

      approvesCollectorWrapper = new ApprovesCollectorWrapper({}, {}, defaultAddress);
      sinon.stub(approvesCollectorWrapper, 'contract').resolves(contractMock);
    });

    afterEach(() => {
      resetHistory(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await approvesCollectorWrapper.approveTransaction(transactionId);
      expect(approveTransactionStub).to.be.calledWith(transactionId);
      expect(approveTransactionSendStub).to.be.calledOnceWith({from: defaultAddress});
    });
  });

  describe('hasApproved', () => {
    let hasApprovedStub;
    let hasApprovedCallStub;
    let contractMock;
    let approvesCollectorWrapper;

    before(async () => {
      hasApprovedStub = sinon.stub();
      hasApprovedCallStub = sinon.stub();
      contractMock = {
        methods: {
          hasApproved: hasApprovedStub.returns({
            call: hasApprovedCallStub.resolves(true)
          })
        }
      };

      approvesCollectorWrapper = new ApprovesCollectorWrapper({}, {}, defaultAddress);
      sinon.stub(approvesCollectorWrapper, 'contract').resolves(contractMock);
    });

    afterEach(() => {
      resetHistory(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      const ret = await approvesCollectorWrapper.hasApproved(testUser, transactionId);
      expect(hasApprovedStub).to.be.calledWith(testUser, transactionId);
      expect(hasApprovedCallStub).to.be.calledOnce;
      expect(ret).to.equal(true);
    });
  });

  describe('getPendingTransactions', () => {
    let getPendingTransactionsStub;
    let getPendingTransactionsCallStub;
    let contractMock;
    let approvesCollectorWrapper;

    before(async () => {
      getPendingTransactionsStub = sinon.stub();
      getPendingTransactionsCallStub = sinon.stub();
      contractMock = {
        methods: {
          getPendingTransactions: getPendingTransactionsStub.returns({
            call: getPendingTransactionsCallStub.resolves(transactionId)
          })
        }
      };

      approvesCollectorWrapper = new ApprovesCollectorWrapper({}, {}, defaultAddress);
      sinon.stub(approvesCollectorWrapper, 'contract').resolves(contractMock);
    });

    afterEach(() => {
      resetHistory(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      const ret = await approvesCollectorWrapper.getPendingTransactions();
      expect(getPendingTransactionsStub).to.be.calledOnce;
      expect(getPendingTransactionsCallStub).to.be.calledOnce;
      expect(ret).to.equal(transactionId);
    });
  });

  describe('getTransactionInfo', () => {
    let getTransactionInfoStub;
    let getTransactionInfoCallStub;
    let contractMock;
    let approvesCollectorWrapper;

    before(async () => {
      getTransactionInfoStub = sinon.stub();
      getTransactionInfoCallStub = sinon.stub();
      contractMock = {
        methods: {
          getTransactionInfo: getTransactionInfoStub.returns({
            call: getTransactionInfoCallStub.resolves(testTransactionInfo)
          })
        }
      };

      approvesCollectorWrapper = new ApprovesCollectorWrapper({}, {}, defaultAddress);
      sinon.stub(approvesCollectorWrapper, 'contract').resolves(contractMock);
    });

    afterEach(() => {
      resetHistory(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      const ret = await approvesCollectorWrapper.getTransactionInfo(transactionId);
      expect(getTransactionInfoStub).to.be.calledWith(transactionId);
      expect(getTransactionInfoCallStub).to.be.calledOnce;
      expect(ret['0']).to.equal(testTransactionInfo['0']);
      expect(ret['1']).to.equal(testTransactionInfo['1']);
    });
  });

  describe('addAdministrator', () => {
    let addAdministratorStub;
    let addAdministratorSendStub;
    let contractMock;
    let approvesCollectorWrapper;

    before(async () => {
      addAdministratorStub = sinon.stub();
      addAdministratorSendStub = sinon.stub();
      contractMock = {
        methods: {
          addAdministrator: addAdministratorStub.returns({
            send: addAdministratorSendStub.resolves()
          })
        }
      };

      approvesCollectorWrapper = new ApprovesCollectorWrapper({}, {}, defaultAddress);
      sinon.stub(approvesCollectorWrapper, 'contract').resolves(contractMock);
    });

    afterEach(() => {
      resetHistory(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await approvesCollectorWrapper.addAdministrator(testUser);
      expect(addAdministratorStub).to.be.calledWith(testUser);
      expect(addAdministratorSendStub).to.be.calledOnceWith({from: defaultAddress});
    });
  });

  describe('deleteAdministrator', () => {
    let deleteAdministratorStub;
    let deleteAdministratorSendStub;
    let contractMock;
    let approvesCollectorWrapper;

    before(async () => {
      deleteAdministratorStub = sinon.stub();
      deleteAdministratorSendStub = sinon.stub();
      contractMock = {
        methods: {
          deleteAdministrator: deleteAdministratorStub.returns({
            send: deleteAdministratorSendStub.resolves()
          })
        }
      };

      approvesCollectorWrapper = new ApprovesCollectorWrapper({}, {}, defaultAddress);
      sinon.stub(approvesCollectorWrapper, 'contract').resolves(contractMock);
    });

    afterEach(() => {
      resetHistory(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await approvesCollectorWrapper.deleteAdministrator(testUser);
      expect(deleteAdministratorStub).to.be.calledWith(testUser);
      expect(deleteAdministratorSendStub).to.be.calledOnceWith({from: defaultAddress});
    });
  });

  describe('addCriticalApprover', () => {
    let addCriticalApproverStub;
    let addCriticalApproverSendStub;
    let contractMock;
    let approvesCollectorWrapper;

    before(async () => {
      addCriticalApproverStub = sinon.stub();
      addCriticalApproverSendStub = sinon.stub();
      contractMock = {
        methods: {
          addCriticalApprover: addCriticalApproverStub.returns({
            send: addCriticalApproverSendStub.resolves()
          })
        }
      };

      approvesCollectorWrapper = new ApprovesCollectorWrapper({}, {}, defaultAddress);
      sinon.stub(approvesCollectorWrapper, 'contract').resolves(contractMock);
    });

    afterEach(() => {
      resetHistory(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await approvesCollectorWrapper.addCriticalApprover(testUser);
      expect(addCriticalApproverStub).to.be.calledWith(testUser);
      expect(addCriticalApproverSendStub).to.be.calledOnceWith({from: defaultAddress});
    });
  });

  describe('deleteCriticalApprover', () => {
    let deleteCriticalApproverStub;
    let deleteCriticalApproverSendStub;
    let contractMock;
    let approvesCollectorWrapper;

    before(async () => {
      deleteCriticalApproverStub = sinon.stub();
      deleteCriticalApproverSendStub = sinon.stub();
      contractMock = {
        methods: {
          deleteCriticalApprover: deleteCriticalApproverStub.returns({
            send: deleteCriticalApproverSendStub.resolves()
          })
        }
      };

      approvesCollectorWrapper = new ApprovesCollectorWrapper({}, {}, defaultAddress);
      sinon.stub(approvesCollectorWrapper, 'contract').resolves(contractMock);
    });

    afterEach(() => {
      resetHistory(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await approvesCollectorWrapper.deleteCriticalApprover(testUser);
      expect(deleteCriticalApproverStub).to.be.calledWith(testUser);
      expect(deleteCriticalApproverSendStub).to.be.calledOnceWith({from: defaultAddress});
    });
  });

  describe('getMultiplexor', () => {
    let getMultiplexorStub;
    let getMultiplexorCallStub;
    let contractMock;
    let approvesCollectorWrapper;

    before(async () => {
      getMultiplexorStub = sinon.stub();
      getMultiplexorCallStub = sinon.stub();
      contractMock = {
        methods: {
          getMultiplexor: getMultiplexorStub.returns({
            call: getMultiplexorCallStub.resolves(testContract)
          })
        }
      };

      approvesCollectorWrapper = new ApprovesCollectorWrapper({}, {}, defaultAddress);
      sinon.stub(approvesCollectorWrapper, 'contract').resolves(contractMock);
    });

    afterEach(() => {
      resetHistory(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      const res = await approvesCollectorWrapper.getMultiplexor();
      expect(getMultiplexorStub).to.be.calledOnce;
      expect(getMultiplexorCallStub).to.be.calledOnce;
      expect(res).be.equal(testContract);
    });
  });

  describe('setMultiplexingContract', () => {
    let setMultiplexingContractStub;
    let setMultiplexingContractSendStub;
    let contractMock;
    let approvesCollectorWrapper;

    before(async () => {
      setMultiplexingContractStub = sinon.stub();
      setMultiplexingContractSendStub = sinon.stub();
      contractMock = {
        methods: {
          updateMultiplexorContract: setMultiplexingContractStub.returns({
            send: setMultiplexingContractSendStub.resolves()
          })
        }
      };

      approvesCollectorWrapper = new ApprovesCollectorWrapper({}, {}, defaultAddress);
      sinon.stub(approvesCollectorWrapper, 'contract').resolves(contractMock);
    });

    afterEach(() => {
      resetHistory(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await approvesCollectorWrapper.updateMultiplexorContract(testContract);
      expect(setMultiplexingContractStub).to.be.calledOnceWith(testContract);
      expect(setMultiplexingContractSendStub).to.be.calledOnceWith({from: defaultAddress});
    });
  });
});
