/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createWeb3, deployContract, getDefaultAddress} from '../../src/utils/web3_tools';
import ConstructorOwnableJson from '../../src/contracts/ConstructorOwnable.json';
import GenesisContractWrapper from '../../src/wrappers/genesis_contract_wrapper';

chai.use(chaiAsPromised);

describe('Genesis Contract Wrapper', () => {
  let web3;
  let ownerAddress;
  let otherAddress;
  let contract;
  let wrapper;

  const deploy = async (web3, sender) => deployContract(web3, ConstructorOwnableJson, [sender], {from: sender});

  before(async () => {
    web3 = await createWeb3();
    ownerAddress = getDefaultAddress(web3);
    otherAddress = web3.eth.accounts.create().address;
  });

  beforeEach(async () => {
    contract = await deploy(web3, ownerAddress);
    wrapper = new GenesisContractWrapper(contract.options.address, ConstructorOwnableJson, web3, ownerAddress);
  });

  it('getOwner returns the owner address', async () => {
    await expect(wrapper.getOwner()).to.eventually.equal(ownerAddress);
  });

  it('address returns the contract address', async () => {
    expect(wrapper.address()).to.equal(contract.options.address);
  });

  it('transferOwnership changes the owner of the contract', async () => {
    await expect(wrapper.transferOwnership(otherAddress)).to.be.fulfilled;
    await expect(wrapper.getOwner()).to.eventually.equal(otherAddress);
  });
});


