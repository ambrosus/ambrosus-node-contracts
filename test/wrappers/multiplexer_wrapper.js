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
import Web3 from 'web3';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Multiplexer wrapper', () => {
  let multiplexerWrapper;
  const exampleABI = '0xc0ffee';
  const defaultAddress = '0x12345';
  let contractMock;
  let contractMethodStub;
  let contractMethodEncodeAbiStub;

  const prepareTest = (contractMethodName) => {
    contractMethodStub = sinon.stub();
    contractMethodEncodeAbiStub = sinon.stub().returns(exampleABI);
    contractMethodStub.returns({
      encodeABI: contractMethodEncodeAbiStub
    });
    contractMock = {
      methods: {
        [contractMethodName]: contractMethodStub
      }
    };
    const web3Mock = new Web3();

    sinon.stub(web3Mock.eth, 'Contract').callsFake(() => contractMock);

    multiplexerWrapper = new MultiplexerWrapper({}, web3Mock, defaultAddress);
    sinon.stub(multiplexerWrapper, 'contract').resolves(contractMock);
  };

  [
    ['0xcce524b4', 'setBaseUploadFee'],
    ['0x3b9aa98a', 'transferOwnershipForBlockRewards'],
    ['0x5366dbc0', 'changeContext'],
    ['0x8ab1d681', 'removeFromWhitelist'],
    ['0xa6f1e840', 'transferContractsOwnership'],
    ['0xbe08add3', 'transferOwnershipForValidatorSet'],
    ['0xf2fde38b', 'transferOwnership'],
    ['0xfae37c3a', 'addToWhitelist']
  ].forEach(([signature, functionName]) =>
    it(`correctly resolves method name for ${functionName}`, async () => {
      prepareTest();
      expect(multiplexerWrapper.getFunctionName(`${signature}1234`)).to.equal(functionName);
    })
  );

  it('correctly resolves method arguments', async () => {
    prepareTest();
    const parameters = new Web3().eth.abi.encodeParameters(['uint256'], ['100']).substring(2);
    const setBaseUploadFeeSignature = `0xcce524b4`;
    expect(multiplexerWrapper.getFunctionArguments(`${setBaseUploadFeeSignature}${parameters}`)).to.deep.equal({fee: '100'});
  });

  describe('transferContractsOwnership', () => {
    const newOwnerAddress = '0x123';

    beforeEach(() => {
      prepareTest('transferContractsOwnership');
    });

    it('calls contract method with correct arguments and returns data', async () => {
      expect(await multiplexerWrapper.transferContractsOwnership(newOwnerAddress)).to.equal(exampleABI);
      expect(contractMethodStub).to.be.calledWith(newOwnerAddress);
      expect(contractMethodEncodeAbiStub).to.be.calledOnce;
    });
  });

  describe('changeContext', () => {
    const newContextAddress = '0x123';

    beforeEach(() => {
      prepareTest('changeContext');
    });

    it('calls contract method with correct arguments and returns data', async () => {
      expect(await multiplexerWrapper.changeContext(newContextAddress)).to.equal(exampleABI);
      expect(contractMethodStub).to.be.calledWith(newContextAddress);
      expect(contractMethodEncodeAbiStub).to.be.calledOnce;
    });
  });

  describe('addToWhitelist', () => {
    const candidateAddress = '0x123';
    const exampleRole = 2;
    const exampleDeposit = 100;

    beforeEach(() => {
      prepareTest('addToWhitelist');
    });

    it('calls contract method with correct arguments and returns data', async () => {
      expect(await multiplexerWrapper.addToWhitelist(candidateAddress, exampleRole, exampleDeposit)).to.equal(exampleABI);
      expect(contractMethodStub).to.be.calledWith(candidateAddress, exampleRole, exampleDeposit);
      expect(contractMethodEncodeAbiStub).to.be.calledOnce;
    });
  });

  describe('removeFromWhitelist', () => {
    const candidateAddress = '0x123';

    beforeEach(() => {
      prepareTest('removeFromWhitelist');
    });

    it('calls contract method with correct arguments and returns data', async () => {
      expect(await multiplexerWrapper.removeFromWhitelist(candidateAddress)).to.equal(exampleABI);
      expect(contractMethodStub).to.be.calledWith(candidateAddress);
      expect(contractMethodEncodeAbiStub).to.be.calledOnce;
    });
  });

  describe('setBaseUploadFee', () => {
    const fee = '42';

    beforeEach(() => {
      prepareTest('setBaseUploadFee');
    });

    it('calls contract method with correct arguments and returns data', async () => {
      expect(await multiplexerWrapper.setBaseUploadFee(fee)).to.equal(exampleABI);
      expect(contractMethodStub).to.be.calledWith(fee);
      expect(contractMethodEncodeAbiStub).to.be.calledOnce;
    });
  });

  describe('transferOwnershipForValidatorSet', () => {
    const newOwnerAddress = '0x123';

    beforeEach(() => {
      prepareTest('transferOwnershipForValidatorSet');
    });

    it('calls contract method with correct arguments and returns data', async () => {
      expect(await multiplexerWrapper.transferOwnershipForValidatorSet(newOwnerAddress)).to.equal(exampleABI);
      expect(contractMethodStub).to.be.calledWith(newOwnerAddress);
      expect(contractMethodEncodeAbiStub).to.be.calledOnce;
    });
  });

  describe('transferOwnershipForBlockRewards', () => {
    const newOwnerAddress = '0x123';

    beforeEach(() => {
      prepareTest('transferOwnershipForBlockRewards');
    });

    it('calls contract method with correct arguments and returns data', async () => {
      expect(await multiplexerWrapper.transferOwnershipForBlockRewards(newOwnerAddress)).to.equal(exampleABI);
      expect(contractMethodStub).to.be.calledWith(newOwnerAddress);
      expect(contractMethodEncodeAbiStub).to.be.calledOnce;
    });
  });
});
