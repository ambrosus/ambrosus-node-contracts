/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import deploy from '../../helpers/deploy';
import {deployContract, createWeb3, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import PoolNode from '../../../src/contracts/PoolNode.json';
import PoolTest from '../../../src/contracts/PoolTest.json';
import {ROLE_CODES} from '../../../src/constants';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect, assert} = chai;


async function asyncExpectToBeReverted(asyncFunc, message) {
  try {
    await asyncFunc();
  } catch (err) {
    assert.include(err.message.split('\n')[0], 'reverted', message);
    return;
  }
  assert.fail(message);
}

describe('PoolsNodesStorage Contract', () => {
  let web3;
  let owner;
  let addr1;
  let addr2;
  let snapshotId;

  let poolNode;
  let poolsNodesStorage;
  let poolTest;
  let context;

  const addPool = (pool, senderAddress = owner) => poolsNodesStorage.methods.addPool(pool).send({from: senderAddress});
  const removePool = (pool, senderAddress = owner) => poolsNodesStorage.methods.removePool(pool).send({from: senderAddress});
  const isPool = (pool, senderAddress = owner) => poolsNodesStorage.methods.isPool(pool).call({from: senderAddress});

  const addNode = (node, pool, nodeType, senderAddress = owner) => poolsNodesStorage.methods.addNode(node, pool, nodeType).send({from: senderAddress});
  const getNodeType = (node, senderAddress = owner) => poolsNodesStorage.methods.getNodeType(node).call({from: senderAddress});

  const lockNode = (pool, nodeType, senderAddress = owner) => poolsNodesStorage.methods.lockNode(pool, nodeType).send({from: senderAddress});
  const unlockNode = (node, senderAddress = owner) => poolsNodesStorage.methods.unlockNode(node).send({from: senderAddress});

  const testLockUnlockNode = (stor, node, senderAddress = owner) => poolTest.methods.testLockUnlockNode(stor, node).send({from: senderAddress});
  const addToWhitelist = (addrs, senderAddress = owner) => context.methods.addToWhitelist(addrs).send({from: senderAddress});

  before(async () => {
    web3 = await createWeb3();
    web3.eth.handleRevert = true;
    [owner, addr1, addr2] = await web3.eth.getAccounts();

    const deployedContracts = await deploy({
      web3,
      contracts: {
        poolsNodesStorage: true
      }
    });

    ({poolsNodesStorage, context} = deployedContracts);

    poolNode = await deployContract(web3, PoolNode, [poolsNodesStorage.options.address]);
    poolTest = await deployContract(web3, PoolTest);

    await addToWhitelist([poolTest.options.address]);
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  it('isPool, addPool, removePool', async () => {
    const poolAddr = addr1;
    expect(await isPool(poolAddr)).to.equal(false);
    await addPool(poolAddr);
    expect(await isPool(poolAddr)).to.equal(true);
    await asyncExpectToBeReverted(() => addPool(poolAddr), 'shoud revert when pool already registered');

    await removePool(poolAddr);
    expect(await isPool(poolAddr)).to.equal(false);
    await asyncExpectToBeReverted(() => removePool(poolAddr), 'shoud revert when pool not registered');
  });

  it('addNode', async () => {
    const node = poolNode.options.address;
    const pool = addr2;
    expect(await getNodeType(node)).to.equal(ROLE_CODES.NONE);
    await asyncExpectToBeReverted(() => addNode(node, pool, ROLE_CODES.NONE), 'shoud revert when nodeType = NONE');
    await addNode(node, pool, ROLE_CODES.ATLAS);
    expect(await getNodeType(node)).to.equal(ROLE_CODES.ATLAS);
    await asyncExpectToBeReverted(() => addNode(node, pool, ROLE_CODES.ATLAS), 'shoud revert when node already exists');
  });

  it('lockNode, unlockNode', async () => {
    const node = poolNode.options.address;
    const stor = poolsNodesStorage.options.address;
    const pool = addr2;
    const zeroAddr = '0x0000000000000000000000000000000000000000';

    await asyncExpectToBeReverted(() => unlockNode(node), 'shoud revert when node not added');
    await asyncExpectToBeReverted(() => lockNode(pool, ROLE_CODES.NONE), 'shoud revert when nodeType = NONE');
    await asyncExpectToBeReverted(() => lockNode(zeroAddr, ROLE_CODES.ATLAS), 'shoud revert when pool address = address(0)');

    await testLockUnlockNode(stor, node);
  });
});
