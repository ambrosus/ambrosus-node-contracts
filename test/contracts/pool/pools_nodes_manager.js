/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {expect, asyncExpectToBeReverted} from '../../helpers/chaiPreconf';
import deploy from '../../helpers/deploy';
import {createWeb3, makeSnapshot, restoreSnapshot, deployContract} from '../../../src/utils/web3_tools';
import PoolNode from '../../../src/contracts/PoolNode.json';
import PoolTest from '../../../src/contracts/PoolTest.json';
import {ROLE_CODES, ZERO_ADDRESS, APOLLO_DEPOSIT} from '../../../src/constants';
import {utils} from 'web3';

const {toBN} = utils;

describe('PoolsNodesManager Contract', () => {
  let web3;
  let owner;
  let initialApollo;
  let addr1;
  let addr2;

  let node;
  let manager;

  let snapshotId;

  let poolsNodesManager;
  let poolsNodesStorage;
  let poolNode;
  let poolTest;
  let context;

  const addPool = (pool, senderAddress = owner) => poolsNodesManager.methods.addPool(pool).send({from: senderAddress});
  const removePool = (pool, senderAddress = owner) => poolsNodesManager.methods.removePool(pool).send({from: senderAddress});

  const onboard = (nodeType, senderAddress = owner, options = {}) => poolsNodesManager.methods.onboard(nodeType).send({from: senderAddress, ...options});
  const retire = (nodeAddress, senderAddress = owner) => poolsNodesManager.methods.retire(nodeAddress).send({from: senderAddress});

  const testOnboardRetire = (manager, nodeType, senderAddress = owner, options = {}) => poolTest.methods.testOnboardRetire(manager, nodeType).send({from: senderAddress, ...options});
  const testRetire = (node, manager, senderAddress = owner, options = {}) => poolTest.methods.testRetire(node, manager).send({from: senderAddress, ...options});

  const addToWhitelist = (addrs, senderAddress = owner) => context.methods.addToWhitelist(addrs).send({from: senderAddress});

  const addNode = (node, pool, nodeType, senderAddress = owner) => poolsNodesStorage.methods.addNode(node, pool, nodeType).send({from: senderAddress});

  before(async () => {
    web3 = await createWeb3();
    web3.eth.handleRevert = true;
    [owner, initialApollo, addr1, addr2] = await web3.eth.getAccounts();

    ({poolsNodesManager, poolsNodesStorage, context} = await deploy({
      web3,
      contracts: {
        config: true,
        kycWhitelistStore: true,
        atlasStakeStore: true,
        rolesStore: true,
        apolloDepositStore: true,
        rolesEventEmitter: true,
        validatorProxy: true,
        validatorSet: true,
        blockRewards: true,
        poolsNodesStorage: true,
        poolsNodesManager: true
      },
      params: {
        validatorSet: {
          owner,
          initialValidators : [initialApollo],
          superUser: owner
        },
        blockRewards: {
          owner,
          baseReward: '2000000000000000000',
          superUser: owner
        }
      }
    }));

    poolNode = await deployContract(web3, PoolNode, [poolsNodesStorage.options.address]);
    poolTest = await deployContract(web3, PoolTest);

    await addToWhitelist([poolTest.options.address]);

    node = poolNode.options.address;
    manager = poolsNodesManager.options.address;
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  it('addPool, removePool', async () => {
    const poolAddr = addr1;

    await asyncExpectToBeReverted(() => addPool(ZERO_ADDRESS), 'shoud revert when pool = address(0)');
    await asyncExpectToBeReverted(() => removePool(ZERO_ADDRESS), 'shoud revert when pool = address(0)');

    await addPool(poolAddr);
    await asyncExpectToBeReverted(() => addPool(poolAddr), 'shoud revert when pool already registered');

    await removePool(poolAddr);
    await asyncExpectToBeReverted(() => removePool(poolAddr), 'shoud revert when pool not registered');
  });

  it('onboard, retire', async () => {
    const poolAddr = addr1;
    const spender = addr2;

    await asyncExpectToBeReverted(() => onboard(ROLE_CODES.APOLLO, poolAddr), 'shoud revert when sender is not pool');

    await addPool(poolAddr);
    await asyncExpectToBeReverted(() => onboard(ROLE_CODES.NONE, poolAddr), 'shoud revert when nodeType = NONE');
    await asyncExpectToBeReverted(() => onboard(ROLE_CODES.HERMES, poolAddr), 'shoud revert when nodeType = HERMES');
    await asyncExpectToBeReverted(() => onboard(ROLE_CODES.ATLAS, poolAddr), 'shoud revert when nodeType = ATLAS');
    await asyncExpectToBeReverted(() => retire(ZERO_ADDRESS, poolAddr), 'shoud revert when nodeAddress = address(0)');
    await removePool(poolAddr);

    await addPool(poolTest.options.address);

    const gasPrice = toBN('1');
    const spenderBalanceBefore = toBN(await web3.eth.getBalance(spender));
    const {gasUsed} = await testOnboardRetire(manager, ROLE_CODES.APOLLO, spender, {value:APOLLO_DEPOSIT, gasPrice});
    const fee = gasPrice.mul(toBN(gasUsed));
    const spenderBalanceAfter = toBN(await web3.eth.getBalance(spender));
    const accum = spenderBalanceBefore
      .sub(fee)
      .sub(spenderBalanceAfter);
    expect(accum.toString()).to.equal('0');
  });

  it('retiring not onboarded ATLAS', async () => {
    await addPool(poolTest.options.address);
    await addNode(node, addr1, ROLE_CODES.ATLAS);
    await testRetire(node, manager);  // retire returns 0
  });

  it('retiring not onboarded HERMES', async () => {
    await addPool(poolTest.options.address);
    await addNode(node, addr1, ROLE_CODES.HERMES);
    await testRetire(node, manager);  // retire returns 0
  });

  it('retiring not onboarded APOLLO', async () => {
    await addPool(poolTest.options.address);
    await addNode(node, addr1, ROLE_CODES.APOLLO);
    await asyncExpectToBeReverted(() => testRetire(node, manager), 'should revert when retiring not onboarded APOLLO node');
  });
});
