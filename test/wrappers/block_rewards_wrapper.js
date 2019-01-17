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
import BlockRewardsWrapper from '../../src/wrappers/block_rewards_wrapper';

chai.use(chaiAsPromised);

describe('Block Rewards Wrapper', () => {
  let web3;
  let ownerAddress;
  let contract;
  let wrapper;

  const deploy = async (web3, sender) => deployContract(web3, contractJsons.blockRewards, [sender, '2000000000000000000', sender], {from: sender});

  before(async () => {
    web3 = await createWeb3();
    ownerAddress = getDefaultAddress(web3);
    contract = await deploy(web3, ownerAddress);
    wrapper = new BlockRewardsWrapper(contract.options.address, web3);
  });

  it('getOwner returns the owner address', async () => {
    await expect(wrapper.getOwner()).to.eventually.equal(ownerAddress);
  });
});


