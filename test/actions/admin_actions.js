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
import AdministrativeActions from '../../src/actions/admin_actions';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Administrative actions', () => {
  let adminActions;
  let headWrapperMock;
  let blockchainStatusWrapperMock;
  let feesWrapperMock;
  let kycWhitelistWrapperMock;
  let validatorProxyWrapperMock;
  const exampleAddress = '0x123';
  const defaultAddress = '0xc0ffee';

  beforeEach(() => {
    headWrapperMock = {
      setContext: sinon.stub().resolves(),
      getOwner: sinon.stub().resolves(defaultAddress),
      transferOwnership: sinon.stub().resolves(),
      defaultAddress
    };
    feesWrapperMock = {
      transferOwnership: sinon.stub().resolves()
    };
    kycWhitelistWrapperMock = {
      transferOwnership: sinon.stub().resolves()
    };
    validatorProxyWrapperMock = {
      transferOwnership: sinon.stub().resolves()
    };
    blockchainStatusWrapperMock = {
      isAddressAContract: sinon.stub().resolves(true)
    };
    adminActions = new AdministrativeActions(headWrapperMock, kycWhitelistWrapperMock, feesWrapperMock,
      validatorProxyWrapperMock, blockchainStatusWrapperMock);
  });

  describe('Move ownerships to multiplexer', () => {
    const exampleMultiplexerAddress = '0xc0ffee';

    it('Transfers ownership of head', async () => {
      await adminActions.moveOwnershipsToMultiplexer(exampleMultiplexerAddress);
      expect(headWrapperMock.transferOwnership).to.be.calledOnceWith(exampleMultiplexerAddress);
      expect(kycWhitelistWrapperMock.transferOwnership).to.be.calledOnceWith(exampleMultiplexerAddress);
      expect(feesWrapperMock.transferOwnership).to.be.calledOnceWith(exampleMultiplexerAddress);
      expect(validatorProxyWrapperMock.transferOwnership).to.be.calledOnceWith(exampleMultiplexerAddress);
    });
  });

  describe('Switch context', () => {
    it('calls setContext with passed address', async () => {
      await adminActions.switchContext(exampleAddress);
      expect(headWrapperMock.setContext).to.be.calledOnceWith(exampleAddress);
    });

    it('throws when the default address is not an owner of Head contract', async () => {
      headWrapperMock.getOwner.resolves('0x98765');
      await expect(adminActions.switchContext(exampleAddress)).to.be.rejected;
      expect(headWrapperMock.setContext).to.be.not.called;
    });

    it('throws when there is no contract deployed under new address', async () => {
      blockchainStatusWrapperMock.isAddressAContract.resolves(false);
      await expect(adminActions.switchContext(exampleAddress)).to.be.rejected;
      expect(headWrapperMock.setContext).to.be.not.called;
      expect(blockchainStatusWrapperMock.isAddressAContract).to.be.calledOnceWith(exampleAddress);
    });
  });
});
