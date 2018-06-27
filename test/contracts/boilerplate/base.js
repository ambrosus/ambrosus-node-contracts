/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3, deployContract} from '../../../src/web3_tools';
import web3jsChai from '../../helpers/events';

import Contract1Json from '../../../build/contracts/Contract1.json';
import Contract2Json from '../../../build/contracts/Contract2.json';
import HeadJson from '../../../build/contracts/Head.json';
import {removeFromWhitelist} from '../../helpers/whitelist';
import {MockContextDeployer} from '../../helpers/deploy';

chai.use(web3jsChai());

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Base Contract', () => {
  let web3;
  let contract1;
  let contract2;
  let context;
  let deployer;

  beforeEach(async () => {
    web3 = await createWeb3();
    deployer = new MockContextDeployer(web3);
    deployer.head = await deployContract(web3, HeadJson);
    const headAddress = deployer.head.options.address;
    contract2 = await deployContract(web3, Contract2Json, [headAddress]);
    contract1 = await deployContract(web3, Contract1Json, [headAddress, contract2.options.address]);
    context = await deployer.setupContext(
      ['0x0', '0x0', '0x0', '0x0', '0x0', '0x0', '0x0', '0x0', '0x0', '0x0', '0x0', '0x0'],
      [contract1.options.address, contract2.options.address]);
  });

  it('onlyContextInternalCalls should allow calling methods by whitelisted contracts', async () => {
    await expect(contract1.methods.callOtherContract().call()).to.be.eventually.fulfilled;
    await removeFromWhitelist(web3, context, [contract1.options.address]);
    await expect(contract1.methods.callOtherContract().call()).to.be.eventually.rejected;
  });
});
