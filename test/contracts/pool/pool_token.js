/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {expect, assert} from '../../helpers/chaiPreconf';
import {createWeb3, makeSnapshot, restoreSnapshot, deployContract} from '../../../src/utils/web3_tools';
import PoolToken from '../../../src/contracts/PoolToken.json';
import {utils} from 'web3';
import {ZERO_ADDRESS} from '../../../src/constants';

const {toBN} = utils;

describe('PoolToken Contract', () => {
  let web3;
  let owner;
  let addr1;
  let addr2;
  let snapshotId;
  let poolToken;

  const mintAmount = toBN('1000000000000000000000000000000000000');

  const mint = (to, amount, senderAddress = owner) => poolToken.methods.mint(to, amount).send({from: senderAddress});
  const burn = (account, amount, senderAddress = owner) => poolToken.methods.burn(account, amount).send({from: senderAddress});
  const balanceOf = (_who, senderAddress = owner) => poolToken.methods.balanceOf(_who).call({from: senderAddress});
  const totalSupply = (senderAddress = owner) => poolToken.methods.totalSupply().call({from: senderAddress});
  const transfer = (_to, _value, senderAddress = owner) => poolToken.methods.transfer(_to, _value).send({from: senderAddress});
  // const transferFrom = (_from, _to, _value, senderAddress = owner) => poolToken.methods.transferFrom(_from, _to, _value).send({from: senderAddress});

  before(async () => {
    web3 = await createWeb3();
    web3.eth.handleRevert = true;
    [owner, addr1, addr2] = await web3.eth.getAccounts();
    poolToken = await deployContract(web3, PoolToken);
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  it('mint', async () => {
    const receipt = await mint(addr1, mintAmount);
    expect(receipt).to.have.deep.nested.property('events.Transfer.returnValues', {
      0: ZERO_ADDRESS,
      1: addr1,
      2: mintAmount.toString(),
      from: ZERO_ADDRESS,
      to: addr1,
      value: mintAmount.toString()
    });
    expect(await totalSupply()).to.equal(mintAmount.toString());
    expect(await balanceOf(addr1)).to.equal(mintAmount.toString());

    await assert.isReverted(mint(addr1, mintAmount, addr1));
  });

  it('burn', async () => {
    await mint(addr1, mintAmount);
    await assert.isReverted(burn(addr1, mintAmount, addr1));
    await assert.isReverted(burn(addr1, mintAmount.add(toBN(1))));

    const receipt = await burn(addr1, mintAmount);
    expect(receipt).to.have.deep.nested.property('events.Transfer.returnValues', {
      0: addr1,
      1: ZERO_ADDRESS,
      2: mintAmount.toString(),
      from: addr1,
      to: ZERO_ADDRESS,
      value: mintAmount.toString()
    });
    expect(await totalSupply()).to.equal('0');
    expect(await balanceOf(addr1)).to.equal('0');
  });

  it('transfer', async () => {
    await mint(addr1, mintAmount);
    const receipt = await transfer(addr2, mintAmount, addr1);
    expect(receipt).to.have.deep.nested.property('events.Transfer.returnValues', {
      0: addr1,
      1: addr2,
      2: mintAmount.toString(),
      from: addr1,
      to: addr2,
      value: mintAmount.toString()
    });
    expect(await balanceOf(addr1)).to.equal('0');
    expect(await balanceOf(addr2)).to.equal(mintAmount.toString());

    await assert.isReverted(transfer(addr2, mintAmount, addr1));
  });
});
