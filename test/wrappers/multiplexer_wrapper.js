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
import MultiplexerWrapper from '../../src/wrappers/multiplexer_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Multiplexer wrapper', () => {
  let multiplexerWrapper;
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
    multiplexerWrapper = new MultiplexerWrapper({}, web3Mock, defaultAddress);
  };

  describe('transferContractsOwnership', () => {
    const newOwnerAddress = '0x123';

    beforeEach(async () => {
      await prepareTest('transferContractsOwnership');
    });

    it('calls contract method with correct arguments', async () => {
      await multiplexerWrapper.transferContractsOwnership(newOwnerAddress);
      expect(contractMethodStub).to.be.calledWith(newOwnerAddress);
      expect(contractMethodSendStub).to.be.calledWith({from: defaultAddress});
    });
  });

  describe('changeContext', () => {
    const newContextAddress = '0x123';

    beforeEach(async () => {
      await prepareTest('changeContext');
    });

    it('calls contract method with correct arguments', async () => {
      await multiplexerWrapper.changeContext(newContextAddress);
      expect(contractMethodStub).to.be.calledWith(newContextAddress);
      expect(contractMethodSendStub).to.be.calledWith({from: defaultAddress});
    });
  });

  describe('addToWhitelist', () => {
    const candidateAddress = '0x123';
    const exampleRole = 2;
    const exampleDeposit = 100;

    beforeEach(async () => {
      await prepareTest('addToWhitelist');
    });

    it('calls contract method with correct arguments', async () => {
      await multiplexerWrapper.addToWhitelist(candidateAddress, exampleRole, exampleDeposit);
      expect(contractMethodStub).to.be.calledWith(candidateAddress, exampleRole, exampleDeposit);
      expect(contractMethodSendStub).to.be.calledWith({from: defaultAddress});
    });
  });

  describe('removeFromWhitelist', () => {
    const candidateAddress = '0x123';

    beforeEach(async () => {
      await prepareTest('removeFromWhitelist');
    });

    it('calls contract method with correct arguments', async () => {
      await multiplexerWrapper.removeFromWhitelist(candidateAddress);
      expect(contractMethodStub).to.be.calledWith(candidateAddress);
      expect(contractMethodSendStub).to.be.calledWith({from: defaultAddress});
    });
  });

  describe('setBaseUploadFee', () => {
    const fee = '42';

    beforeEach(async () => {
      await prepareTest('setBaseUploadFee');
    });


    it('calls contract method with correct arguments', async () => {
      await multiplexerWrapper.setBaseUploadFee(fee);
      expect(contractMethodStub).to.be.calledWith(fee);
      expect(contractMethodSendStub).to.be.calledWith({from: defaultAddress});
    });
  });

  describe('transferOwnershipForValidatorSet', () => {
    const newOwnerAddress = '0x123';

    beforeEach(async () => {
      await prepareTest('transferOwnershipForValidatorSet');
    });


    it('calls contract method with correct arguments', async () => {
      await multiplexerWrapper.transferOwnershipForValidatorSet(newOwnerAddress);
      expect(contractMethodStub).to.be.calledWith(newOwnerAddress);
      expect(contractMethodSendStub).to.be.calledWith({from: defaultAddress});
    });
  });

  describe('transferOwnershipForBlockRewards', () => {
    const newOwnerAddress = '0x123';

    beforeEach(async () => {
      await prepareTest('transferOwnershipForBlockRewards');
    });


    it('calls contract method with correct arguments', async () => {
      await multiplexerWrapper.transferOwnershipForBlockRewards(newOwnerAddress);
      expect(contractMethodStub).to.be.calledWith(newOwnerAddress);
      expect(contractMethodSendStub).to.be.calledWith({from: defaultAddress});
    });
  });
});
