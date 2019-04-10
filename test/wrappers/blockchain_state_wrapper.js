/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import {createWeb3, deployContract} from '../../src/utils/web3_tools';
import chai from 'chai';
import BlockchainStateWrapper from '../../src/wrappers/blockchain_state_wrapper';
import chaiAsPromised from 'chai-as-promised';
import contractJsons from '../../src/contract_jsons';
import sinon from 'sinon';

const {expect} = chai;

chai.use(chaiAsPromised);

describe('BlockchainStateWrapper', () => {
  let web3;
  let wrapper;

  beforeEach(async () => {
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
    it('returns true for contracts', async () => {
      const contractAddress = (await deployContract(web3, contractJsons.config)).options.address;
      expect(await wrapper.isAddressAContract(contractAddress)).to.be.true;
    });

    it('returns false if for regular wallets', async () => {
      // Randomly copied from etherscan
      const randomAddress = '0x78b5C928Baa639bDC1E48670b450EB8717BB746a';
      expect(await wrapper.isAddressAContract(randomAddress)).to.be.false;
    });
  });

  describe('getBalance', () => {
    const currentBalance = '42';
    const exampleAddress = '0xc0ffee';

    beforeEach(() => {
      web3 = {
        eth: {
          getBalance: sinon.stub()
        }
      };
      web3.eth.getBalance.withArgs(exampleAddress).resolves(currentBalance);
      wrapper = new BlockchainStateWrapper(web3);
    });

    it('returns balance of the account', async () => {
      expect(await wrapper.getBalance(exampleAddress)).to.equal(currentBalance);
    });
  });

  describe('getLatestBlockNumber', () => {
    const currentBlockNumber = '2137';

    beforeEach(() => {
      web3 = {
        eth: {
          getBlockNumber: sinon.stub().resolves(currentBlockNumber)
        }
      };
      wrapper = new BlockchainStateWrapper(web3);
    });

    it('returns number of latest block', async () => {
      expect(await wrapper.getCurrentBlockNumber()).to.equal(currentBlockNumber);
    });
  });
});
