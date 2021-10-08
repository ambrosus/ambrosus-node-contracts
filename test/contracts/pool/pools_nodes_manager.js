/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {expect, assert} from '../../helpers/chaiPreconf';
import deploy from '../../helpers/deploy';
import {createWeb3, makeSnapshot, restoreSnapshot, deployContract} from '../../../src/utils/web3_tools';
import PoolTest from '../../../src/contracts/PoolTest.json';
import {ROLE_CODES, ZERO_ADDRESS, APOLLO_DEPOSIT} from '../../../src/constants';
import {utils} from 'web3';

const {toBN} = utils;

describe('PoolsNodesManager Contract', () => {
  let web3;
  let owner;
  let initialApollo;
  let pool;
  let spender;

  let node;
  let manager;

  let snapshotId;

  let poolsNodesManager;
  let poolsNodesStorage;
  let poolTest;
  let context;

  const addPool = (pool, senderAddress = owner) => poolsNodesManager.methods.addPool(pool).send({from: senderAddress});
  const removePool = (pool, senderAddress = owner) => poolsNodesManager.methods.removePool(pool).send({from: senderAddress});

  const onboard = (nodeType, senderAddress = owner, options = {}) => poolsNodesManager.methods.onboard(nodeType).send({from: senderAddress, ...options});
  const retire = (nodeAddress, senderAddress = owner) => poolsNodesManager.methods.retire(nodeAddress).send({from: senderAddress});

  const testOnboardRetire = (manager, nodeType, senderAddress = owner, options = {}) => poolTest.methods.testOnboardRetire(manager, nodeType).send({from: senderAddress, ...options});

  const addToWhitelist = (addrs, senderAddress = owner) => context.methods.addToWhitelist(addrs).send({from: senderAddress});

  const addNode = (node, pool, nodeType, senderAddress = owner) => poolsNodesStorage.methods.addNode(node, pool, nodeType).send({from: senderAddress});

  before(async () => {
    web3 = await createWeb3();
    web3.eth.handleRevert = true;
    [owner, initialApollo, pool, spender] = await web3.eth.getAccounts();

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

    poolTest = await deployContract(web3, PoolTest);

    await addToWhitelist([poolTest.options.address]);

    manager = poolsNodesManager.options.address;
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  it('addPool, removePool', async () => {
    await assert.isReverted(addPool(ZERO_ADDRESS));
    await assert.isReverted(removePool(ZERO_ADDRESS));

    await addPool(pool);
    await assert.isReverted(addPool(pool));

    await removePool(pool);
    await assert.isReverted(removePool(pool));
  });

  it('onboard, retire', async () => {
    await assert.isReverted(onboard(ROLE_CODES.APOLLO, pool));

    await addPool(pool);
    await assert.isReverted(onboard(ROLE_CODES.NONE, pool));
    await assert.isReverted(onboard(ROLE_CODES.HERMES, pool));
    await assert.isReverted(onboard(ROLE_CODES.ATLAS, pool));
    await assert.isReverted(retire(ZERO_ADDRESS, pool));
    await removePool(pool);

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
    await addPool(pool);
    await addNode(node, pool, ROLE_CODES.ATLAS);
    await assert.isReverted(retire(node, pool));
  });

  it('retiring not onboarded HERMES', async () => {
    await addPool(pool);
    await addNode(node, pool, ROLE_CODES.HERMES);
    await assert.isReverted(retire(node, pool));
  });

  it('retiring not onboarded APOLLO', async () => {
    await addPool(pool);
    await addNode(node, pool, ROLE_CODES.APOLLO);
    await assert.isReverted(retire(node, pool));
  });
});
