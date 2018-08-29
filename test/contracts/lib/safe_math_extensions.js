/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3, deployContract} from '../../../src/utils/web3_tools';
import SafeMathExtensionsAdapter from '../../../build/contracts/SafeMathExtensionsAdapter.json';
import BN from 'bn.js';
import {ONE} from '../../helpers/consts';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;


describe('SafeMathExtensions', () => {
  const MAX_UINT32 = new BN(2)
    .pow(new BN(32))
    .sub(new BN(1));
  const MAX_UINT64 = new BN(2)
    .pow(new BN(64))
    .sub(new BN(1));
  const MAX_UINT128 = new BN(2)
    .pow(new BN(128))
    .sub(new BN(1));
  const MAX_UINT256 = new BN(2)
    .pow(new BN(256))
    .sub(new BN(1));

  let web3;
  let safeMathExtension;

  beforeEach(async () => {
    web3 = await createWeb3();
    safeMathExtension = await deployContract(web3, SafeMathExtensionsAdapter);
  });

  it('pow2', async () => {
    expect(await safeMathExtension.methods.safePow2(0).call()).to.equal('1');
    expect(await safeMathExtension.methods.safePow2(1).call()).to.equal('2');
    expect(await safeMathExtension.methods.safePow2(2).call()).to.equal('4');
    expect(await safeMathExtension.methods.safePow2(3).call()).to.equal('8');
    expect(await safeMathExtension.methods.safePow2(4).call()).to.equal('16');
    expect(await safeMathExtension.methods.safePow2(16).call()).to.equal('65536');
    expect(await safeMathExtension.methods.safePow2(24).call()).to.equal('16777216');
    expect(await safeMathExtension.methods.safePow2(100).call()).to.equal('1267650600228229401496703205376');
    expect(await safeMathExtension.methods.safePow2(255).call()).to.equal('57896044618658097711785492504343953926634992332820282019728792003956564819968');
    await expect(safeMathExtension.methods.safePow2(256).call()).to.be.eventually.rejected;
    await expect(safeMathExtension.methods.safePow2(300).call()).to.be.eventually.rejected;
    await expect(safeMathExtension.methods.safePow2(1000).call()).to.be.eventually.rejected;
  });

  it('mod', async () => {
    expect(await safeMathExtension.methods.mod(0, 2).call()).to.equal('0');
    expect(await safeMathExtension.methods.mod(1, 2).call()).to.equal('1');
    expect(await safeMathExtension.methods.mod(2, 2).call()).to.equal('0');
    expect(await safeMathExtension.methods.mod(3, 2).call()).to.equal('1');
    expect(await safeMathExtension.methods.mod(4, 2).call()).to.equal('0');

    expect(await safeMathExtension.methods.mod(0, 3).call()).to.equal('0');
    expect(await safeMathExtension.methods.mod(1, 3).call()).to.equal('1');
    expect(await safeMathExtension.methods.mod(2, 3).call()).to.equal('2');
    expect(await safeMathExtension.methods.mod(3, 3).call()).to.equal('0');
    expect(await safeMathExtension.methods.mod(4, 3).call()).to.equal('1');
    expect(await safeMathExtension.methods.mod(5, 3).call()).to.equal('2');
    expect(await safeMathExtension.methods.mod(6, 3).call()).to.equal('0');

    expect(await safeMathExtension.methods.mod(0, MAX_UINT256).call()).to.equal('0');
    expect(await safeMathExtension.methods.mod(7, MAX_UINT256).call()).to.equal('7');
    expect(await safeMathExtension.methods.mod(MAX_UINT256, MAX_UINT256).call()).to.equal('0');

    await expect(safeMathExtension.methods.mod(0, 0).call()).to.be.eventually.rejected;
    await expect(safeMathExtension.methods.mod(1, 0).call()).to.be.eventually.rejected;
    await expect(safeMathExtension.methods.mod(2, 0).call()).to.be.eventually.rejected;
    await expect(safeMathExtension.methods.mod(10, 0).call()).to.be.eventually.rejected;
    await expect(safeMathExtension.methods.mod(MAX_UINT256, 0).call()).to.be.eventually.rejected;
  });

  describe('castTo32', () => {
    it('works for numbers that fit into 32 bits', async () => {
      const result = await safeMathExtension.methods.castTo32(MAX_UINT32).call();
      expect(result).to.equal(MAX_UINT32.toString());
    });

    it(`throws for numbers that dont fit into 32 bits`, async () => {
      const promise = safeMathExtension.methods.castTo32(MAX_UINT32.add(ONE)).call();
      await expect(promise).to.be.eventually.rejected;
    });
  });

  describe('castTo64', () => {
    it('works for numbers that fit into 64 bits', async () => {
      const result = await safeMathExtension.methods.castTo64(MAX_UINT64).call();
      expect(result).to.equal(MAX_UINT64.toString());
    });

    it(`throws for numbers that dont fit into 64 bits`, async () => {
      const promise = safeMathExtension.methods.castTo64(MAX_UINT64.add(ONE)).call();
      await expect(promise).to.be.eventually.rejected;
    });
  });

  describe('castTo128', () => {
    it('works for numbers that fit into 128 bits', async () => {
      const result = await safeMathExtension.methods.castTo128(MAX_UINT128).call();
      expect(result).to.equal(MAX_UINT128.toString());
    });

    it(`throws for numbers that dont fit into 128 bits`, async () => {
      const promise = safeMathExtension.methods.castTo128(MAX_UINT128.add(ONE)).call();
      await expect(promise).to.be.eventually.rejected;
    });
  });
});
