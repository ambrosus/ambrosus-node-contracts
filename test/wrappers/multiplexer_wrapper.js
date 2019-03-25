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

  describe('transferContractsOwnership', () => {
    const newOwnerAddress = '0x123';
    let transferContractsOwnershipStub;
    let transferContractsOwnershipSendStub;
    let contractMock;

    beforeEach(async () => {
      transferContractsOwnershipStub = sinon.stub();
      transferContractsOwnershipSendStub = sinon.stub();
      transferContractsOwnershipStub.returns({
        send: transferContractsOwnershipSendStub
      });
      contractMock = {
        methods: {
          transferContractsOwnership: transferContractsOwnershipStub
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
      sinon.stub(multiplexerWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await multiplexerWrapper.transferContractsOwnership(newOwnerAddress);
      expect(transferContractsOwnershipStub).to.be.calledWith(newOwnerAddress);
      expect(transferContractsOwnershipSendStub).to.be.calledWith({from: defaultAddress});
    });
  });
});
