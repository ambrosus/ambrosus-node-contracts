/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {expect, assert} from '../../helpers/chaiPreconf';
import deploy from '../../helpers/deploy';
import {createWeb3, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import {ROLE_CODES, ZERO_ADDRESS, APOLLO_DEPOSIT, ATLAS1_STAKE} from '../../../src/constants';
import {utils} from 'web3';

const {toBN} = utils;

async function checkEvent(contract, eventName, blockNumber, values) {
  const events = await contract.getPastEvents(eventName, {fromBlock:blockNumber, toBlock:blockNumber});
  expect(events, `${eventName} event not found`).to.have.lengthOf(1);
  if (values['0'] === undefined) {
    let index = 0;
    for (const key in values) {
      values[index] = values[key];
      index++;
    }
  }
  expect(events[0].returnValues).to.deep.equal(values);
}

describe('PoolsNodesManager Contract', () => {
  let web3;
  let owner;
  let initialApollo;
  let pool;
  let node;
  let user;

  let snapshotId;

  let poolsNodesManager;
  let poolEventsEmitter;
  let poolsStore;
  let rolesEventEmitter;

  const addPool = (pool, senderAddress = owner) => poolsNodesManager.methods.addPool(pool).send({from: senderAddress});
  const removePool = (pool, senderAddress = owner) => poolsNodesManager.methods.removePool(pool).send({from: senderAddress});

  const onboard = (nodeAddress, nodeType, senderAddress = owner, options = {}) => poolsNodesManager.methods.onboard(nodeAddress, nodeType).send({from: senderAddress, ...options});
  const retire = (nodeAddress, nodeType, senderAddress = owner, options = {}) => poolsNodesManager.methods.retire(nodeAddress, nodeType).send({from: senderAddress, ...options});

  const poolStakeChanged = (user, stake, tokens, senderAddress = owner) => poolsNodesManager.methods.poolStakeChanged(user, stake, tokens).send({from: senderAddress});
  const poolReward = (reward, tokenPrice, senderAddress = owner) => poolsNodesManager.methods.poolReward(reward, tokenPrice).send({from: senderAddress});
  const addNodeRequest = (stake, requestId, nodeId, role, senderAddress = owner) => poolsNodesManager.methods.addNodeRequest(stake, requestId, nodeId, role).send({from: senderAddress});
  const addNodeRequestResolved = (requestId, status, senderAddress = owner) => poolsNodesManager.methods.addNodeRequestResolved(requestId, status).send({from: senderAddress});

  before(async () => {
    web3 = await createWeb3();
    web3.eth.handleRevert = true;
    [owner, initialApollo, pool, node, user] = await web3.eth.getAccounts();

    ({poolsNodesManager, poolEventsEmitter, poolsStore, rolesEventEmitter} = await deploy({
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
        poolsStore: true,
        poolEventsEmitter: true,
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
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  it('nextId', async () => {
    const nextId = poolsNodesManager.methods.nextId();
    expect(await nextId.call({from: owner})).to.equal('1');
    await nextId.send({from: owner});
    expect(await nextId.call({from: owner})).to.equal('2');
  });

  it('addPool, removePool', async () => {
    await assert.isReverted(addPool(ZERO_ADDRESS));
    await assert.isReverted(removePool(ZERO_ADDRESS));

    let {blockNumber} = await addPool(pool);
    await checkEvent(poolsStore, 'PoolAdded', blockNumber, {
      poolAddress: pool
    });

    await assert.isReverted(addPool(pool));

    ({blockNumber} = await removePool(pool));
    await checkEvent(poolsStore, 'PoolRemoved', blockNumber, {
      poolAddress: pool
    });

    await assert.isReverted(removePool(pool));
  });

  it('poolStakeChanged, poolReward, addNodeRequest, addNodeRequestResolved', async () => {
    await addPool(pool);

    const one = '1000000000000000000';
    let {blockNumber} = await poolStakeChanged(user, one, one, pool);
    await checkEvent(poolEventsEmitter, 'PoolStakeChanged', blockNumber, {
      pool,
      user,
      stake: one,
      tokens: one
    });

    ({blockNumber} = await poolReward(one, one, pool));
    await checkEvent(poolEventsEmitter, 'PoolReward', blockNumber, {
      pool,
      reward: one,
      tokenPrice: one
    });

    ({blockNumber} = await addNodeRequest(one, '1', '2', ROLE_CODES.APOLLO, pool));
    await checkEvent(poolEventsEmitter, 'AddNodeRequest', blockNumber, {
      pool,
      id: '1',
      nodeId: '2',
      stake: one,
      role: ROLE_CODES.APOLLO
    });

    ({blockNumber} = await addNodeRequestResolved('1', '2', pool));
    await checkEvent(poolEventsEmitter, 'AddNodeRequestResolved', blockNumber, {
      pool,
      id: '1',
      status: '2'
    });
  });

  it('onboard, retire', async () => {
    await assert.isReverted(onboard(node, ROLE_CODES.APOLLO, pool, {value:APOLLO_DEPOSIT}));

    await addPool(pool);
    await assert.isReverted(onboard(node, ROLE_CODES.NONE, pool));
    await assert.isReverted(onboard(node, ROLE_CODES.HERMES, pool));
    await assert.isReverted(onboard(node, ROLE_CODES.ATLAS, pool, {value:ATLAS1_STAKE}));
    await assert.isReverted(retire(ZERO_ADDRESS, ROLE_CODES.APOLLO, pool));

    let fee;
    let gasUsed;
    let blockNumber;
    const gasPrice = toBN('1');
    const balance1 = toBN(await web3.eth.getBalance(pool));
    ({gasUsed, blockNumber} = await onboard(node, ROLE_CODES.APOLLO, pool, {value:APOLLO_DEPOSIT, gasPrice}));
    await checkEvent(rolesEventEmitter, 'NodeOnboarded', blockNumber, {
      nodeAddress:node,
      placedDeposit:APOLLO_DEPOSIT,
      nodeUrl:'',
      role:ROLE_CODES.APOLLO
    });
    fee = gasPrice.mul(toBN(gasUsed));

    const balance2 = toBN(await web3.eth.getBalance(pool));
    expect(balance1.sub(toBN(APOLLO_DEPOSIT)).sub(fee)
      .toString()).to.equal(balance2.toString());

    ({gasUsed, blockNumber} = await retire(node, ROLE_CODES.APOLLO, pool, {gasPrice}));
    await checkEvent(rolesEventEmitter, 'NodeRetired', blockNumber, {
      nodeAddress:node,
      releasedDeposit:APOLLO_DEPOSIT,
      role:ROLE_CODES.APOLLO
    });
    fee = gasPrice.mul(toBN(gasUsed));

    const balance3 = toBN(await web3.eth.getBalance(pool));
    expect(balance2.add(toBN(APOLLO_DEPOSIT)).sub(fee)
      .toString()).to.equal(balance3.toString());
  });

  it('retiring not onboarded node', async () => {
    await addPool(pool);
    await assert.isReverted(retire(node, ROLE_CODES.ATLAS, pool));
    await assert.isReverted(retire(node, ROLE_CODES.HERMES, pool));
    await assert.isReverted(retire(node, ROLE_CODES.APOLLO, pool));
  });
});
