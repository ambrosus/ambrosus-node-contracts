/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import {createWeb3} from '../../src/utils/web3_tools';
import chai from 'chai';
import BlockchainStateWrapper from '../../src/wrappers/blockchain_state_wrapper';
import chaiAsPromised from 'chai-as-promised';

const {expect} = chai;

chai.use(chaiAsPromised);

describe('BlockchainStateWrapper', () => {
  it('finds block timestamp', async () => {
    const TIMESTAMP_IN_THE_PAST = 1544536774;
    const web3 = await createWeb3();
    const wrapper = new BlockchainStateWrapper(web3);

    const blockTimestamp = wrapper.getBlockTimestamp('latest');

    await expect(blockTimestamp)
      .to.eventually.be.a('number')
      .and.to.be.above(TIMESTAMP_IN_THE_PAST);
  });
});
