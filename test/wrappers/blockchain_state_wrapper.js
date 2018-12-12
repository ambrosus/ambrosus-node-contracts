/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import {createWeb3, deployContract} from '../../src/utils/web3_tools';
import chai from 'chai';
import BlockchainStateWrapper from '../../src/wrappers/blockchain_state_wrapper';
import chaiAsPromised from 'chai-as-promised';
import contractJsons from '../../src/contract_jsons';

const {expect} = chai;

chai.use(chaiAsPromised);

describe('BlockchainStateWrapper', () => {
  let web3;
  let wrapper;

  before(async () => {
    web3 = await createWeb3();
    wrapper = new BlockchainStateWrapper(web3);
  });

  it('finds block timestamp', async () => {
    const TIMESTAMP_IN_THE_PAST = 1544536774;

    const blockTimestamp = wrapper.getBlockTimestamp('latest');

    await expect(blockTimestamp)
      .to.eventually.be.a('number')
      .and.to.be.above(TIMESTAMP_IN_THE_PAST);
  });

  describe('isAddressAContract', () => {
    it('returns true if a contract is deployed under the address', async () => {
      const contractAddress = (await deployContract(web3, contractJsons.config)).options.address;
      expect(await wrapper.isAddressAContract(contractAddress)).to.be.true;
    });

    it('returns false if no contract is deployed under the address', async () => {
      // Randomly copied from etherscan
      const randomAddress = '0x78b5C928Baa639bDC1E48670b450EB8717BB746a';
      expect(await wrapper.isAddressAContract(randomAddress)).to.be.false;
    });
  });
});
