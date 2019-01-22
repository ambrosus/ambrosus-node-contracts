/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import RolesWrapper from '../../src/wrappers/roles_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Roles Wrapper', () => {
  const exampleAddress = '0xc0ffee';
  const defaultAddress = '0x1234';
  let rolesWrapper;

  describe('onboardedRole', () => {
    let getRoleStub;
    let getRoleCallStub;

    before(async () => {
      getRoleStub = sinon.stub();
      getRoleCallStub = sinon.stub();
      const contractMock = {
        methods: {
          getOnboardedRole: getRoleStub.returns({
            call: getRoleCallStub.resolves('1')
          })
        }
      };
      rolesWrapper = new RolesWrapper();
      sinon.stub(rolesWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      const role = await rolesWrapper.onboardedRole(exampleAddress);
      expect(getRoleStub).to.be.calledWith(exampleAddress);
      expect(getRoleCallStub).to.be.calledOnce;
      expect(role).to.equal('1');
    });
  });

  describe('nodeUrl', () => {
    const nodeUrl = 'url';
    let getUrlStub;
    let getUrlCallStub;

    before(async () => {
      getUrlStub = sinon.stub();
      getUrlCallStub = sinon.stub();
      const contractMock = {
        methods: {
          getUrl: getUrlStub.returns({
            call: getUrlCallStub.resolves(nodeUrl)
          })
        }
      };
      rolesWrapper = new RolesWrapper();
      sinon.stub(rolesWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      const url = await rolesWrapper.nodeUrl(exampleAddress);
      expect(getUrlStub).to.be.calledWith(exampleAddress);
      expect(getUrlCallStub).to.be.calledOnce;
      expect(url).to.equal(nodeUrl);
    });
  });


  describe('setNodeUrl', () => {
    let setNodeUrlStub;
    let setNodeUrlSendStub;
    let contractMock;
    const nodeUrl = 'url';

    before(async () => {
      setNodeUrlStub = sinon.stub();
      setNodeUrlSendStub = sinon.stub();
      contractMock = {
        methods: {
          setUrl: setNodeUrlStub.returns({
            send: setNodeUrlSendStub.resolves()
          })
        }
      };

      rolesWrapper = new RolesWrapper({}, {}, defaultAddress);
      sinon.stub(rolesWrapper, 'contract').resolves(contractMock);
    });


    it('calls contract method with correct arguments', async () => {
      await rolesWrapper.setNodeUrl(exampleAddress, nodeUrl);
      expect(setNodeUrlStub).to.be.calledOnceWith(nodeUrl);
      expect(setNodeUrlSendStub).to.be.calledOnceWith({
        from: exampleAddress
      });
    });
  });

  describe('onboardAsApollo', () => {
    let onboardAsApolloStub;
    let onboardAsApolloSendStub;
    let contractMock;
    const deposit = '100';

    before(async () => {
      onboardAsApolloStub = sinon.stub();
      onboardAsApolloSendStub = sinon.stub();
      contractMock = {
        methods: {
          onboardAsApollo: onboardAsApolloStub.returns({
            send: onboardAsApolloSendStub.resolves()
          })
        }
      };

      rolesWrapper = new RolesWrapper({}, {}, defaultAddress);
      sinon.stub(rolesWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await rolesWrapper.onboardAsApollo(exampleAddress, deposit);
      expect(onboardAsApolloStub).to.be.calledOnceWith();
      expect(onboardAsApolloSendStub).to.be.calledOnceWith({
        from: exampleAddress,
        value: deposit
      });
    });
  });

  describe('onboardAsAtlas', () => {
    let onboardAsAtlasStub;
    let onboardAsAtlasSendStub;
    let contractMock;
    const stake = '100';
    const url = 'url';

    before(async () => {
      onboardAsAtlasStub = sinon.stub();
      onboardAsAtlasSendStub = sinon.stub();
      contractMock = {
        methods: {
          onboardAsAtlas: onboardAsAtlasStub.returns({
            send: onboardAsAtlasSendStub.resolves()
          })
        }
      };
      rolesWrapper = new RolesWrapper({}, {}, defaultAddress);
      sinon.stub(rolesWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await rolesWrapper.onboardAsAtlas(exampleAddress, stake, url);
      expect(onboardAsAtlasStub).to.be.calledOnceWith(url);
      expect(onboardAsAtlasSendStub).to.be.calledOnceWith({
        from: exampleAddress,
        value: stake
      });
    });
  });

  describe('onboardAsHermes', () => {
    let onboardAsHermesStub;
    let onboardAsHermesSendStub;
    let contractMock;
    const url = 'url';

    before(async () => {
      onboardAsHermesStub = sinon.stub();
      onboardAsHermesSendStub = sinon.stub();
      contractMock = {
        methods: {
          onboardAsHermes: onboardAsHermesStub.returns({
            send: onboardAsHermesSendStub.resolves()
          })
        }
      };

      rolesWrapper = new RolesWrapper({}, {}, defaultAddress);
      sinon.stub(rolesWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await rolesWrapper.onboardAsHermes(exampleAddress, url);
      expect(onboardAsHermesStub).to.be.calledOnceWith(url);
      expect(onboardAsHermesSendStub).to.be.calledOnceWith({
        from: exampleAddress
      });
    });
  });
});
