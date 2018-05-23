/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3} from '../../../src/web3_tools';
import web3jsChai from '../../helpers/events';
import deployContracts from '../../../src/deploy';

chai.use(web3jsChai());

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Head contract', () => {
  let web3;
  let head;
  let ownerAddress;
  let otherAddress;

  beforeEach(async () => {
    web3 = await createWeb3();
    ({head} = await deployContracts(web3));
    [ownerAddress, otherAddress] = await web3.eth.getAccounts();
  });

  it('owner can modify context', async () => {
    await head.methods.setContext(otherAddress).send({from: ownerAddress});
    expect(await head.methods.context().call()).to.equal(otherAddress);
  });

  it('not owner cannot modify context', async () => {
    await expect(head.methods.setContext(otherAddress).send({from: otherAddress}))
      .to.be.rejected;
  });
});
