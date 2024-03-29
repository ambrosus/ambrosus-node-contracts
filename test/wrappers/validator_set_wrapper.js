/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai, {expect} from 'chai';
import sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';
import {deployContract, getDefaultAddress} from '../../src/utils/web3_tools';
import {createWeb3Ganache} from '../utils/web3_tools';
import contractJsons from '../../src/contract_jsons';
import ValidatorSetWrapper from '../../src/wrappers/validator_set_wrapper';

chai.use(chaiAsPromised);

describe('ValidatorSet Wrapper', () => {
  let web3;
  let ownerAddress;
  let contract;
  let wrapper;

  const generateValidatorSet = (num) => Array(num)
    .fill(null)
    .map(() => web3.eth.accounts.create().address);
  const deploy = async (web3, sender) => deployContract(web3, contractJsons.validatorSet, [sender, generateValidatorSet(3), sender], {from: sender});

  before(async () => {
    web3 = await createWeb3Ganache();
    ownerAddress = getDefaultAddress(web3);
    contract = await deploy(web3, ownerAddress);
    wrapper = new ValidatorSetWrapper(contract.options.address, web3, ownerAddress);
  });

  it('getOwner returns the owner address', async () => {
    await expect(wrapper.getOwner()).to.eventually.equal(ownerAddress);
  });
  describe('getValidators', () => {
    let getValidatorsStub;
    let getValidatorsCallStub;

    beforeEach(async () => {
      getValidatorsStub = sinon.stub();
      getValidatorsCallStub = sinon.stub();
      const contractMock = {
        methods: {
          getValidators: getValidatorsStub.returns({
            call: getValidatorsCallStub.resolves(true)
          })
        }
      };
      wrapper = new ValidatorSetWrapper(contract.options.address, web3, ownerAddress);
      wrapper.contract = contractMock;
    });

    it('calls contract method correctly', async () => {
      await wrapper.getValidators();
      expect(getValidatorsStub).to.be.calledOnce;
      expect(getValidatorsCallStub).to.be.calledOnce;
    });
  });
});


