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
import ContractWrapper from '../../src/wrappers/contract_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Contract Wrapper', () => {
  let contractWrapper;
  let mockHeadWrapper;
  let mockWeb3;
  let contractNameStub;
  const defaultAddress = '0xdeadface';
  const exampleContractName = 'fees';

  before(() => {
    mockWeb3 = {
      eth: {
        Contract: sinon.stub()
      },
      utils: {
        toWei: sinon.stub()
      }
    };
    mockHeadWrapper = {
      contractAddressByName: sinon.stub()
    };
    contractWrapper = new ContractWrapper(mockHeadWrapper, mockWeb3, defaultAddress, true);
  });

  describe('getting contract', () => {
    before(async () => {
      contractNameStub = sinon.stub(contractWrapper, 'getContractName').get(() => (exampleContractName));
      await expect(contractWrapper.contract()).to.have.been.eventually.fulfilled;
    });

    after(() => {
      contractNameStub.restore();
    });

    it('asks headWrapper for contract address', async () => {
      expect(mockHeadWrapper.contractAddressByName).to.have.been.calledWith(exampleContractName);
    });

    it('constructs new contract', async () => {
      expect(mockWeb3.eth.Contract).to.have.been.called;
    });
  });

  describe('getting name', () => {
    it('should throw if name getter is not overloaded', async () => {
      expect(() => contractWrapper.getContractName()).to.throw('Abstract method getContractName needs to be overridden');
    });
  });

  describe('process transaction', () => {
    let mockTransactionObject;
    const exampleTxData = '0x123';

    beforeEach(() => {
      mockTransactionObject = {
        send: sinon.stub().resolves(),
        encodeABI: sinon.stub().returns(exampleTxData)
      };
    });

    it('sendTransactions is true by default', async () => {
      expect(new ContractWrapper().sendTransactions).to.be.true;
    });

    it('sends transaction when sendTransactions is true', async () => {
      const sendingContractWrapper = new ContractWrapper(mockHeadWrapper, mockWeb3, defaultAddress, true);
      await sendingContractWrapper.processTransaction(mockTransactionObject);
      expect(mockTransactionObject.send).to.be.calledOnceWith({from: defaultAddress});
    });

    it('sets custom send params', async () => {
      const sendingContractWrapper = new ContractWrapper(mockHeadWrapper, mockWeb3, defaultAddress, true);
      const otherAddress = '0xabcdef';
      await sendingContractWrapper.processTransaction(mockTransactionObject, {from: otherAddress, value: 2});
      expect(mockTransactionObject.send).to.be.calledOnceWith({from: otherAddress, value: 2});
    });

    it('returns data when sendTransactions is false', async () => {
      const notSendingContractWrapper = new ContractWrapper(mockHeadWrapper, mockWeb3, defaultAddress, false);
      expect(await notSendingContractWrapper.processTransaction(mockTransactionObject)).to.equal(exampleTxData);
      expect(mockTransactionObject.encodeABI).to.be.calledOnceWith();
      expect(mockTransactionObject.send).to.be.not.called;
    });
  });
});

