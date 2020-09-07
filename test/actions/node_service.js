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
import NodeServiceActions from '../../src/actions/node_service';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Node Service Actions', () => {
  let nodeServiceActions;
  let rolesWrapperStub;

  beforeEach(() => {
    rolesWrapperStub = {
      defaultAddress: 0,
      setNodeUrl: sinon.stub()
    };
    nodeServiceActions = new NodeServiceActions(rolesWrapperStub);
  });
  describe('setNodeUrl', async () => {
    const address = '0xABCD';
    const url = 'http://example.com';

    const callSubject = async () => nodeServiceActions.setNodeUrl(address, url);

    beforeEach(() => {
      rolesWrapperStub.setNodeUrl.resolves();
    });

    it('fails if the address is not the current address', async () => {
      rolesWrapperStub.defaultAddress = '0x0';
      await expect(callSubject()).to.eventually.be.rejected;
    });

    it('proxies the call to the wrapper', async () => {
      rolesWrapperStub.defaultAddress = address;
      await expect(callSubject()).to.eventually.be.fulfilled;
      expect(rolesWrapperStub.setNodeUrl).to.have.been.calledOnceWith(address, url);
    });
  });
});

