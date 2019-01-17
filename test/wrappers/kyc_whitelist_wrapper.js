/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon, {resetHistory} from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import KycWhitelistWrapper from '../../src/wrappers/kyc_whitelist_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('KYC Whitelist Wrapper', () => {
  let kycWhitelistWrapper;
  const defaultAddress = '0x6789';
  const exampleAddress = '0x1234';
  const exampleRole = 2;
  const exampleRequiredDeposit = 10000;

  describe('add', () => {
    let addStub;
    let addSendStub;
    let contractMock;

    before(async () => {
      addStub = sinon.stub();
      addSendStub = sinon.stub();
      contractMock = {
        methods: {
          add: addStub.returns({
            send: addSendStub.resolves()
          })
        }
      };

      kycWhitelistWrapper = new KycWhitelistWrapper({}, {}, defaultAddress);
      sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    afterEach(() => {
      resetHistory(contractMock);
    });

    it('calls contract method with correct arguments ', async () => {
      await kycWhitelistWrapper.add(exampleAddress, exampleRole, exampleRequiredDeposit);
      expect(addStub).to.be.calledWith(exampleAddress, exampleRole, exampleRequiredDeposit);
      expect(addSendStub).to.be.calledOnceWith({from: defaultAddress});
    });
  });

  describe('remove', () => {
    let removeStub;
    let removeSendStub;
    let contractMock;
    before(async () => {
      removeStub = sinon.stub();
      removeSendStub = sinon.stub();
      contractMock = {
        methods: {
          remove: removeStub.returns({
            send: removeSendStub.resolves()
          })
        }
      };

      kycWhitelistWrapper = new KycWhitelistWrapper({}, {}, defaultAddress);
      sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await kycWhitelistWrapper.remove(exampleAddress);
      expect(removeStub).to.be.calledWith(exampleAddress);
      expect(removeSendStub).to.be.calledOnceWith({from: defaultAddress});
    });
  });

  describe('isWhitelisted', () => {
    let isWhitelistedStub;
    let isWhitelistedCallStub;

    before(async () => {
      isWhitelistedStub = sinon.stub();
      isWhitelistedCallStub = sinon.stub();
      const contractMock = {
        methods: {
          isWhitelisted: isWhitelistedStub.returns({
            call: isWhitelistedCallStub.resolves(1)
          })
        }
      };
      kycWhitelistWrapper = new KycWhitelistWrapper();
      sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      const ret = await kycWhitelistWrapper.isWhitelisted(exampleAddress);
      expect(isWhitelistedStub).to.be.calledWith(exampleAddress);
      expect(isWhitelistedCallStub).to.be.calledOnce;
      expect(ret).to.equal(1);
    });
  });

  describe('hasRoleAssigned', () => {
    let hasRoleAssignedStub;
    let hasRoleAssignedCallStub;

    before(async () => {
      hasRoleAssignedStub = sinon.stub();
      hasRoleAssignedCallStub = sinon.stub();
      const contractMock = {
        methods: {
          hasRoleAssigned: hasRoleAssignedStub.returns({
            call: hasRoleAssignedCallStub.resolves(1)
          })
        }
      };
      kycWhitelistWrapper = new KycWhitelistWrapper();
      sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await kycWhitelistWrapper.hasRoleAssigned(exampleAddress, exampleRole);
      expect(hasRoleAssignedStub).to.be.calledWith(exampleAddress, exampleRole);
      expect(hasRoleAssignedCallStub).to.be.calledOnce;
    });
  });

  describe('getRequiredDeposit', () => {
    let getRequiredDepositStub;
    let getRequiredDepositCallStub;

    before(async () => {
      getRequiredDepositStub = sinon.stub();
      getRequiredDepositCallStub = sinon.stub();
      const contractMock = {
        methods: {
          getRequiredDeposit: getRequiredDepositStub.returns({
            call: getRequiredDepositCallStub.resolves(exampleRequiredDeposit)
          })
        }
      };
      kycWhitelistWrapper = new KycWhitelistWrapper();
      sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await kycWhitelistWrapper.getRequiredDeposit(exampleAddress);
      expect(getRequiredDepositStub).to.be.calledWith(exampleAddress);
      expect(getRequiredDepositCallStub).to.be.calledOnce;
    });
  });

  describe('getRoleAssigned', () => {
    let getRoleAssignedStub;
    let getRoleAssignedCallStub;

    before(async () => {
      getRoleAssignedStub = sinon.stub();
      getRoleAssignedCallStub = sinon.stub();
      const contractMock = {
        methods: {
          getRoleAssigned: getRoleAssignedStub.returns({
            call: getRoleAssignedCallStub.resolves(exampleRole)
          })
        }
      };
      kycWhitelistWrapper = new KycWhitelistWrapper();
      sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await kycWhitelistWrapper.getRoleAssigned(exampleAddress);
      expect(getRoleAssignedStub).to.be.calledWith(exampleAddress);
      expect(getRoleAssignedCallStub).to.be.calledOnce;
    });
  });

  describe('getOwner', () => {
    let getOwnerStub;
    let getOwnerCallStub;
    const ownerAddress = '0x1234ABCD';

    before(async () => {
      getOwnerStub = sinon.stub();
      getOwnerCallStub = sinon.stub();
      const contractMock = {
        methods: {
          owner: getOwnerStub.returns({
            call: getOwnerCallStub.resolves(ownerAddress)
          })
        }
      };
      kycWhitelistWrapper = new KycWhitelistWrapper();
      sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await expect(kycWhitelistWrapper.getOwner()).to.eventually.equal(ownerAddress);
      expect(getOwnerStub).to.be.calledOnce;
      expect(getOwnerCallStub).to.be.calledOnce;
    });
  });

  describe('transferOwnership', () => {
    let transferOwnershipStub;
    let transferOwnershipSendStub;
    let contractMock;
    before(async () => {
      transferOwnershipStub = sinon.stub();
      transferOwnershipSendStub = sinon.stub();
      contractMock = {
        methods: {
          transferOwnership: transferOwnershipStub.returns({
            send: transferOwnershipSendStub.resolves()
          })
        }
      };

      kycWhitelistWrapper = new KycWhitelistWrapper({}, {}, defaultAddress);
      sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await kycWhitelistWrapper.transferOwnership(exampleAddress);
      expect(transferOwnershipStub).to.be.calledWith(exampleAddress);
      expect(transferOwnershipSendStub).to.be.calledOnceWith({from: defaultAddress});
    });
  });
});
