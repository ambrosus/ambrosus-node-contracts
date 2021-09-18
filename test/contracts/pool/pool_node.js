/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {expect, asyncExpectToBeReverted} from '../../helpers/chaiPreconf';
import {createWeb3, makeSnapshot, restoreSnapshot, deployContract} from '../../../src/utils/web3_tools';
import PoolNode from '../../../src/contracts/PoolNode.json';
import {utils} from 'web3';

const {toBN} = utils;

describe('PoolNode Contract', () => {
  let web3;
  let owner;
  let addr1;
  let addr2;
  let snapshotId;
  let poolNode;

  const setPool = (newPool, senderAddress = owner, options = {}) => poolNode.methods.setPool(newPool).send({from: senderAddress, ...options});
  const withdraw = (senderAddress = owner, options = {}) => poolNode.methods.withdraw().send({from: senderAddress, ...options});
  const transferOwnership = (newOwner, senderAddress = owner) => poolNode.methods.transferOwnership(newOwner).send({from: senderAddress});
  const getOwner = (senderAddress = owner) => poolNode.methods.owner().call({from: senderAddress});

  before(async () => {
    web3 = await createWeb3();
    [owner, addr1, addr2] = await web3.eth.getAccounts();
    poolNode = await deployContract(web3, PoolNode, [owner]);
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  it('transferOwnership', async () => {
    expect(await getOwner()).to.equal(owner);
    await transferOwnership(addr1);
    expect(await getOwner()).to.equal(addr1);
  });

  it('setPool, withrdaw', async () => {
    await asyncExpectToBeReverted(() => withdraw(), 'should revert when sender != pool');

    const poolAddr = addr1;
    const contractAddr = poolNode.options.address;

    await setPool(poolAddr);

    const gasPrice = toBN('1');
    const reward = toBN('12345678901234567890');
    await web3.eth.sendTransaction({from:addr2, to:contractAddr, value:reward, gasPrice});
    expect(await web3.eth.getBalance(contractAddr)).to.equal(reward.toString());

    const poolBalanceBeforeWithdraw = toBN(await web3.eth.getBalance(poolAddr));

    const {gasUsed} = await withdraw(poolAddr, {gasPrice});
    const withdrawFee = gasPrice.mul(toBN(gasUsed));

    const poolBalanceAfterWithdraw = toBN(await web3.eth.getBalance(poolAddr));

    expect(await web3.eth.getBalance(contractAddr)).to.equal('0');

    const accum = poolBalanceAfterWithdraw
      .add(withdrawFee)
      .sub(reward)
      .sub(poolBalanceBeforeWithdraw);
    expect(accum.toString()).to.equal('0');
  });
});
