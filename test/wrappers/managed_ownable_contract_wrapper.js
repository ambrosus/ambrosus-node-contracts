/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import ManagedOwnableContractWrapper from '../../src/wrappers/managed_ownable_contract_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Managed Ownable Contract Wrapper', () => {
  let wrapper;
  const defaultAddress = '0xDEADBEEF';

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
      wrapper = new ManagedOwnableContractWrapper();
      sinon.stub(wrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await expect(wrapper.getOwner()).to.eventually.equal(ownerAddress);
      expect(getOwnerStub).to.be.calledOnce;
      expect(getOwnerCallStub).to.be.calledOnce;
    });
  });

  describe('transferOwnership', () => {
    const otherAddress = '0x01234567';
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
    });

    before(() => {
      wrapper = new ManagedOwnableContractWrapper({}, {}, defaultAddress);
      sinon.stub(wrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await expect(wrapper.transferOwnership(otherAddress)).to.be.fulfilled;
      expect(transferOwnershipStub).to.be.calledWith(otherAddress);
      expect(transferOwnershipSendStub).to.be.calledOnceWith({from: defaultAddress});
    });
  });
});

