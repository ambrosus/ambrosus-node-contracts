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
import ValidatorProxyWrapper from '../../src/wrappers/validator_proxy_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('ValidatorProxy Wrapper', () => {
  let validatorProxyWrapper;

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
      validatorProxyWrapper = new ValidatorProxyWrapper();
      sinon.stub(validatorProxyWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await expect(validatorProxyWrapper.getOwner()).to.eventually.equal(ownerAddress);
      expect(getOwnerStub).to.be.calledOnce;
      expect(getOwnerCallStub).to.be.calledOnce;
    });
  });

  describe('transferOwnershipForValidatorSet', () => {
    let transferOwnershipForValidatorSetStub;
    let transferOwnershipForValidatorSetSendStub;
    const validatorProxyOwner = '0x1234ABCD';
    const newOwner = '0x926195';

    before(async () => {
      transferOwnershipForValidatorSetStub = sinon.stub();
      transferOwnershipForValidatorSetSendStub = sinon.stub();
      const contractMock = {
        methods: {
          transferOwnershipForValidatorSet: transferOwnershipForValidatorSetStub.returns({
            send: transferOwnershipForValidatorSetSendStub.resolves()
          })
        }
      };
      validatorProxyWrapper = new ValidatorProxyWrapper({}, {}, validatorProxyOwner);
      sinon.stub(validatorProxyWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await expect(validatorProxyWrapper.transferOwnershipForValidatorSet(newOwner)).to.be.fulfilled;
      expect(transferOwnershipForValidatorSetStub).to.be.calledOnceWith(newOwner);
      expect(transferOwnershipForValidatorSetSendStub).to.be.calledOnceWith({from: validatorProxyOwner});
    });
  });

  describe('transferOwnershipForBlockRewards', () => {
    let transferOwnershipForBlockRewardsStub;
    let transferOwnershipForBlockRewardsSendStub;
    const validatorProxyOwner = '0x1234ABCD';
    const newOwner = '0x926195';

    before(async () => {
      transferOwnershipForBlockRewardsStub = sinon.stub();
      transferOwnershipForBlockRewardsSendStub = sinon.stub();
      const contractMock = {
        methods: {
          transferOwnershipForBlockRewards: transferOwnershipForBlockRewardsStub.returns({
            send: transferOwnershipForBlockRewardsSendStub.resolves()
          })
        }
      };
      validatorProxyWrapper = new ValidatorProxyWrapper({}, {}, validatorProxyOwner);
      sinon.stub(validatorProxyWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      await expect(validatorProxyWrapper.transferOwnershipForBlockRewards(newOwner)).to.be.fulfilled;
      expect(transferOwnershipForBlockRewardsStub).to.be.calledOnceWith(newOwner);
      expect(transferOwnershipForBlockRewardsSendStub).to.be.calledOnceWith({from: validatorProxyOwner});
    });
  });
});
