/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import MultisigWrapper from '../../src/wrappers/multisig_wrapper';
import Web3 from 'web3';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Multisig wrapper', () => {
  let multisigWrapper;
  const defaultAddress = '0xc0ffee';
  const exampleABI = '0x12345678';
  let contractMock;
  let contractMethodStub;
  let contractMethodSendStub;
  let web3Mock;

  const prepareSendableTransactionTest = (contractMethodName) => {
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
    multisigWrapper = new MultisigWrapper({}, web3Mock, defaultAddress);
  };


  const prepareEncodedTransactionTest = (contractMethodName) => {
    contractMethodStub = sinon.stub();
    contractMethodSendStub = sinon.stub().returns(exampleABI);
    contractMethodStub.returns({
      encodeABI: contractMethodSendStub
    });
    contractMock = {
      methods: {
        [contractMethodName]: contractMethodStub
      }
    };
    const web3Mock = new Web3();
    sinon.stub(web3Mock.eth, 'Contract').callsFake(() => contractMock);

    multisigWrapper = new MultisigWrapper({}, web3Mock, defaultAddress);
  };

  beforeEach(async () => {
    web3Mock = new Web3();

    sinon.stub(web3Mock.eth, 'Contract').callsFake(() => contractMock);
  });

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
    const exampleTxId = '4';

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
      multisigWrapper = new MultisigWrapper({}, web3Mock, defaultAddress);
      sinon.stub(multisigWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await multisigWrapper.getConfirmations(exampleTxId)).to.equal(exampleConfirmations);
      expect(getConfirmationsStub).to.be.calledOnceWith(exampleTxId);
      expect(getConfirmationsCallStub).to.be.calledOnce;
    });
  });

  describe('getConfirmationCount', () => {
    let getConfirmationCountStub;
    let getConfirmationCountCallStub;
    const exampleConfirmationCount = 5;
    const exampleTxId = '4';

    beforeEach(async () => {
      getConfirmationCountStub = sinon.stub();
      getConfirmationCountCallStub = sinon.stub().resolves(exampleConfirmationCount);
      getConfirmationCountStub.returns({
        call: getConfirmationCountCallStub
      });
      contractMock = {
        methods: {
          getConfirmationCount: getConfirmationCountStub
        }
      };
      multisigWrapper = new MultisigWrapper({}, web3Mock, defaultAddress);
      sinon.stub(multisigWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await multisigWrapper.getConfirmationCount(exampleTxId)).to.equal(exampleConfirmationCount);
      expect(getConfirmationCountStub).to.be.calledOnceWith(exampleTxId);
      expect(getConfirmationCountCallStub).to.be.calledOnce;
    });
  });

  describe('confirmationsRequired', () => {
    let confirmationsRequiredStub;
    let confirmationsRequiredCallStub;
    const exampleRequiredConfirmations = 6;

    beforeEach(async () => {
      confirmationsRequiredStub = sinon.stub();
      confirmationsRequiredCallStub = sinon.stub().resolves(exampleRequiredConfirmations);
      confirmationsRequiredStub.returns({
        call: confirmationsRequiredCallStub
      });
      contractMock = {
        methods: {
          required: confirmationsRequiredStub
        }
      };
      multisigWrapper = new MultisigWrapper({}, web3Mock, defaultAddress);
      sinon.stub(multisigWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await multisigWrapper.confirmationsRequired()).to.equal(exampleRequiredConfirmations);
      expect(confirmationsRequiredStub).to.be.calledOnceWith();
      expect(confirmationsRequiredCallStub).to.be.calledOnce;
    });
  });

  describe('submitTransaction', () => {
    const exampleAddress = '0x123';
    const exampleValue = '42';
    const exampleData = '0xdeadBeef';

    beforeEach(async () => {
      await prepareSendableTransactionTest('submitTransaction');
    });

    it('calls contract method with correct arguments', async () => {
      await multisigWrapper.submitTransaction(exampleAddress, exampleValue, exampleData);
      expect(contractMethodStub).to.be.calledWith(exampleAddress, exampleValue, exampleData);
      expect(contractMethodSendStub).to.be.calledWith({from: defaultAddress});
    });
  });

  describe('confirmTransaction', () => {
    const exampleData = '0x123';

    beforeEach(() => {
      prepareSendableTransactionTest('confirmTransaction');
    });

    it('calls contract method with correct arguments', async () => {
      await multisigWrapper.confirmTransaction(exampleData);
      expect(contractMethodStub).to.be.calledWith(exampleData);
      expect(contractMethodSendStub).to.be.calledWith({from: defaultAddress});
    });
  });

  describe('revokeConfirmation', () => {
    const exampleData = '0x123';

    beforeEach(() => {
      prepareSendableTransactionTest('revokeConfirmation');
    });

    it('calls contract method with correct arguments', async () => {
      await multisigWrapper.revokeConfirmation(exampleData);
      expect(contractMethodStub).to.be.calledWith(exampleData);
      expect(contractMethodSendStub).to.be.calledWith({from: defaultAddress});
    });
  });

  describe('getTransaction', () => {
    let getTransactionStub;
    let getTransactionCallStub;
    const exampleTxId = '0xc0ffee';
    const exampleTransaction = 'mock transaction';

    beforeEach(() => {
      getTransactionStub = sinon.stub();
      getTransactionCallStub = sinon.stub().resolves(exampleTransaction);
      getTransactionStub.returns({
        call: getTransactionCallStub
      });
      contractMock = {
        methods: {
          transactions: getTransactionStub
        }
      };
      multisigWrapper = new MultisigWrapper({}, web3Mock, defaultAddress);
      sinon.stub(multisigWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await multisigWrapper.getTransaction(exampleTxId)).to.equal(exampleTransaction);
      expect(getTransactionStub).to.be.calledOnceWith(exampleTxId);
      expect(getTransactionCallStub).to.be.calledOnce;
    });
  });

  describe('addOwner', () => {
    const exampleNewOwner = '0x123';

    beforeEach(() => {
      prepareEncodedTransactionTest('addOwner');
    });

    it('calls contract method with correct arguments and returns ABI', async () => {
      expect(multisigWrapper.addOwner(exampleNewOwner)).to.equal(exampleABI);
      expect(contractMethodStub).to.be.calledWith(exampleNewOwner);
      expect(contractMethodSendStub).to.be.calledWith();
    });
  });

  describe('removeOwner', () => {
    const exampleOwner = '0x123';

    beforeEach(() => {
      prepareEncodedTransactionTest('removeOwner');
    });

    it('calls contract method with correct arguments and returns ABI', async () => {
      expect(multisigWrapper.removeOwner(exampleOwner)).to.equal(exampleABI);
      expect(contractMethodStub).to.be.calledWith(exampleOwner);
      expect(contractMethodSendStub).to.be.calledWith();
    });
  });

  describe('changeRequirement', () => {
    const exampleNewRequirement = 5;

    beforeEach(() => {
      prepareEncodedTransactionTest('changeRequirement');
    });

    it('calls contract method with correct arguments and returns ABI', async () => {
      expect(multisigWrapper.changeRequirement(exampleNewRequirement)).to.equal(exampleABI);
      expect(contractMethodStub).to.be.calledWith(exampleNewRequirement);
      expect(contractMethodSendStub).to.be.calledWith();
    });
  });
});
