/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createWeb3, deployContract, getDefaultAddress} from '../../src/utils/web3_tools';
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
    web3 = await createWeb3();
    ownerAddress = getDefaultAddress(web3);
    contract = await deploy(web3, ownerAddress);
    wrapper = new ValidatorSetWrapper(contract.options.address, web3, ownerAddress);
  });

  it('getOwner returns the owner address', async () => {
    await expect(wrapper.getOwner()).to.eventually.equal(ownerAddress);
  });
});


