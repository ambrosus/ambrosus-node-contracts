/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {
  createWeb3,
  deployContract
} from '../../../src/web3_tools';
import web3jsChai from '../../helpers/events';

import Contract1Json from '../../../build/contracts/Contract1.json';
import Contract2Json from '../../../build/contracts/Contract2.json';
import HeadJson from '../../../build/contracts/Head.json';
import {deployMockContext, removeFromWhitelist} from '../../helpers/deployAll';


chai.use(web3jsChai());

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Base contract', () => {
  let web3;
  let head;
  let contract1;
  let contract2;
  let context;

  beforeEach(async () => {
    web3 = await createWeb3();
    head = await deployContract(web3, HeadJson.abi, HeadJson.bytecode);
    contract2 = await deployContract(web3, Contract2Json.abi,
      Contract2Json.bytecode,
      [head.options.address]);
    contract1 = await deployContract(web3, Contract1Json.abi,
      Contract1Json.bytecode,
      [head.options.address, contract2.options.address]);
    context = await deployMockContext(web3, head, [contract1.options.address, contract2.options.address, contract2.options.address],
      ['0x0', '0x0', '0x0', '0x0']);
  });

  it('onlyContextInternalCalls should allow calling methods by whitelisted contracts', async () => {
    await expect(contract1.methods.callOtherContract().call()).to.be.eventually.fulfilled;
    await removeFromWhitelist(web3, context, [contract1.options.address]);
    await expect(contract1.methods.callOtherContract().call()).to.be.eventually.rejected;
  });
});
