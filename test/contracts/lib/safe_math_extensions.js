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
import SafeMathExtensions from '../../../build/contracts/SafeMathExtensions.json';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('SafeMathExtensions', () => {
  let web3;
  let safeMathExtensions;

  beforeEach(async () => {
    web3 = await createWeb3();
    safeMathExtensions = await deployContract(web3, SafeMathExtensions);    
  });

  it('pow2', async () => {
    expect(await safeMathExtensions.methods.safePow2(0).call()).to.equal('1');
    expect(await safeMathExtensions.methods.safePow2(1).call()).to.equal('2');
    expect(await safeMathExtensions.methods.safePow2(2).call()).to.equal('4');
    expect(await safeMathExtensions.methods.safePow2(3).call()).to.equal('8');
    expect(await safeMathExtensions.methods.safePow2(4).call()).to.equal('16');
    expect(await safeMathExtensions.methods.safePow2(16).call()).to.equal('65536');
    expect(await safeMathExtensions.methods.safePow2(24).call()).to.equal('16777216');
    expect(await safeMathExtensions.methods.safePow2(100).call()).to.equal('1267650600228229401496703205376');
    expect(await safeMathExtensions.methods.safePow2(255).call()).to.equal('57896044618658097711785492504343953926634992332820282019728792003956564819968');
    await expect(safeMathExtensions.methods.safePow2(256).call()).to.be.eventually.rejected;
    await expect(safeMathExtensions.methods.safePow2(300).call()).to.be.eventually.rejected;
    await expect(safeMathExtensions.methods.safePow2(1000).call()).to.be.eventually.rejected;
  });
});
