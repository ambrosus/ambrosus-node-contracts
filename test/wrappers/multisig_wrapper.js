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
import MultisigWrapper from '../../src/wrappers/multisig_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Multisig wrapper', () => {
  let multisigWrapper;
  const defaultAddress = '0xc0ffee';
  let contractMock;
  let contractMethodStub;
  let contractMethodSendStub;

  const prepareTest = async (contractMethodName) => {
    contractMethodStub = sinon.stub();
    contractMethodSendStub = sinon.stub();
    contractMethodStub.returns({
      send: contractMethodSendStub
    });
    contractMock = {
      methods: {
        [contractMethodName]: contractMethodStub
      }
    };
    const web3Mock = {
      eth: {
        Contract: sinon.mock().returns(contractMock)
      },
      utils: {
        toWei: sinon.stub()
      }
    };
    multisigWrapper = new MultisigWrapper({}, web3Mock, defaultAddress);
  };

  describe('getPendingTransaction', () => {
    let getTransactionCountStub;
    let getTransactionCountCallStub;
    let getTransactionIdsStub;
    let getTransactionIdsCallStub;
    const exampleTxCount = 10;
    const exampleTransactions = ['0x123', '0x456'];

    beforeEach(async () => {
      getTransactionCountStub = sinon.stub();
      getTransactionCountCallStub = sinon.stub().resolves(exampleTxCount);
      getTransactionCountStub.returns({
        call: getTransactionCountCallStub
      });
      getTransactionIdsStub = sinon.stub();
      getTransactionIdsCallStub = sinon.stub().resolves(exampleTransactions);
      getTransactionIdsStub.returns({
        call: getTransactionIdsCallStub
      });
      contractMock = {
        methods: {
          getTransactionCount: getTransactionCountStub,
          getTransactionIds: getTransactionIdsStub
        }
      };
      const web3Mock = {
        eth: {
          Contract: sinon.mock().returns(contractMock)
        },
        utils: {
          toWei: sinon.stub()
        }
      };
      multisigWrapper = new MultisigWrapper({}, web3Mock, defaultAddress);
      sinon.stub(multisigWrapper, 'contract').resolves(contractMock);
    });

    it('gets pending transactions count and correctly fetches all fetching tx ids', async () => {
      expect(await multisigWrapper.getPendingTransaction()).to.equal(exampleTransactions);
      expect(getTransactionCountStub).to.be.calledOnceWith(true, false);
      expect(getTransactionCountCallStub).to.be.calledOnce;
      expect(getTransactionIdsStub).to.be.calledOnceWith(0, exampleTxCount, true, false);
      expect(getTransactionIdsCallStub).to.be.calledOnce;
    });
  });

  describe('getConfirmations', () => {
    let getConfirmationsStub;
    let getConfirmationsCallStub;
    const exampleConfirmations = ['0x123', '0x456'];
    const exampleTxId = '0xc0ffee';

    beforeEach(async () => {
      getConfirmationsStub = sinon.stub();
      getConfirmationsCallStub = sinon.stub().resolves(exampleConfirmations);
      getConfirmationsStub.returns({
        call: getConfirmationsCallStub
      });
      contractMock = {
        methods: {
          getConfirmations: getConfirmationsStub
        }
      };
      const web3Mock = {
        eth: {
          Contract: sinon.mock().returns(contractMock)
        },
        utils: {
          toWei: sinon.stub()
        }
      };
      multisigWrapper = new MultisigWrapper({}, web3Mock, defaultAddress);
      sinon.stub(multisigWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await multisigWrapper.getConfirmations(exampleTxId)).to.equal(exampleConfirmations);
      expect(getConfirmationsStub).to.be.calledOnceWith(exampleTxId);
      expect(getConfirmationsCallStub).to.be.calledOnce;
    });
  });

  describe('submitTransaction', () => {
    const exampleAddress = '0x123';
    const exampleValue = '42';
    const exampleData = '0xdeadBeef';

    beforeEach(async () => {
      await prepareTest('submitTransaction');
    });

    it('calls contract method with correct arguments', async () => {
      await multisigWrapper.submitTransaction(exampleAddress, exampleValue, exampleData);
      expect(contractMethodStub).to.be.calledWith(exampleAddress, exampleValue, exampleData);
      expect(contractMethodSendStub).to.be.calledWith({from: defaultAddress});
    });
  });

  describe('confirmTransaction', () => {
    const exampleData = '0x123';

    beforeEach(async () => {
      await prepareTest('confirmTransaction');
    });

    it('calls contract method with correct arguments', async () => {
      await multisigWrapper.confirmTransaction(exampleData);
      expect(contractMethodStub).to.be.calledWith(exampleData);
      expect(contractMethodSendStub).to.be.calledWith({from: defaultAddress});
    });
  });

  describe('revokeConfirmation', () => {
    const exampleData = '0x123';

    beforeEach(async () => {
      await prepareTest('revokeConfirmation');
    });

    it('calls contract method with correct arguments', async () => {
      await multisigWrapper.revokeConfirmation(exampleData);
      expect(contractMethodStub).to.be.calledWith(exampleData);
      expect(contractMethodSendStub).to.be.calledWith({from: defaultAddress});
    });
  });

  xdescribe('getTransaction', () => {
    const exampleTransactionId = '0x123';

    beforeEach(async () => {
      await prepareTest('revokeConfirmation');
    });

    it('calls contract method with correct arguments', async () => {
      await multisigWrapper.revokeConfirmation(exampleData);
      expect(contractMethodStub).to.be.calledWith(exampleData);
      expect(contractMethodSendStub).to.be.calledWith({from: defaultAddress});
    });
  });
});
