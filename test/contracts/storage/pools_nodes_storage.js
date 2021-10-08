/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {expect, assert} from '../../helpers/chaiPreconf';
import deploy from '../../helpers/deploy';
import {deployContract, createWeb3, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import PoolTest from '../../../src/contracts/PoolTest.json';
import {ROLE_CODES, ZERO_ADDRESS} from '../../../src/constants';

describe('PoolsNodesStorage Contract', () => {
  let web3;
  let owner;
  let addr1;
  let addr2;
  let snapshotId;

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

    await assert.isReverted(addPool(ZERO_ADDRESS));

    await addPool(poolAddr);
    expect(await isPool(poolAddr)).to.equal(true);
    await assert.isReverted(addPool(poolAddr));

    await removePool(poolAddr);
    expect(await isPool(poolAddr)).to.equal(false);
    await assert.isReverted(removePool(poolAddr));
  });

  it('addNode', async () => {
    const pool = addr2;
    expect(await getNodeType(node)).to.equal(ROLE_CODES.NONE);
    await assert.isReverted(addNode(node, pool, ROLE_CODES.NONE));
    await addNode(node, pool, ROLE_CODES.ATLAS);
    expect(await getNodeType(node)).to.equal(ROLE_CODES.ATLAS);
    await assert.isReverted(addNode(node, pool, ROLE_CODES.ATLAS));
  });

  it('lockNode, unlockNode', async () => {
    const stor = poolsNodesStorage.options.address;
    const pool = addr2;

    await assert.isReverted(unlockNode(node));
    await assert.isReverted(lockNode(pool, ROLE_CODES.NONE));
    await assert.isReverted(lockNode(ZERO_ADDRESS, ROLE_CODES.ATLAS));

    await testLockUnlockNode(stor, node);
  });
});
