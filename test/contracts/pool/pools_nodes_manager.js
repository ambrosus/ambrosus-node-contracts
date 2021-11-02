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

describe('PoolsNodesManager Contract', () => {
  let web3;
  let owner;
  let initialApollo;
  let pool;
  let node;

  let snapshotId;

  let poolsNodesManager;

  const addPool = (pool, senderAddress = owner) => poolsNodesManager.methods.addPool(pool).send({from: senderAddress});
  const removePool = (pool, senderAddress = owner) => poolsNodesManager.methods.removePool(pool).send({from: senderAddress});

  const onboard = (nodeAddress, nodeType, senderAddress = owner, options = {}) => poolsNodesManager.methods.onboard(nodeAddress, nodeType).send({from: senderAddress, ...options});
  const retire = (nodeAddress, nodeType, senderAddress = owner, options = {}) => poolsNodesManager.methods.retire(nodeAddress, nodeType).send({from: senderAddress, ...options});

  before(async () => {
    web3 = await createWeb3();
    web3.eth.handleRevert = true;
    [owner, initialApollo, pool, node] = await web3.eth.getAccounts();

    ({poolsNodesManager} = await deploy({
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

  it('addPool, removePool', async () => {
    await assert.isReverted(addPool(ZERO_ADDRESS));
    await assert.isReverted(removePool(ZERO_ADDRESS));

    await addPool(pool);
    await assert.isReverted(addPool(pool));

    await removePool(pool);
    await assert.isReverted(removePool(pool));
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
    const gasPrice = toBN('1');
    const balance1 = toBN(await web3.eth.getBalance(pool));
    ({gasUsed} = await onboard(node, ROLE_CODES.APOLLO, pool, {value:APOLLO_DEPOSIT, gasPrice}));
    fee = gasPrice.mul(toBN(gasUsed));

    const balance2 = toBN(await web3.eth.getBalance(pool));
    expect(balance1.sub(toBN(APOLLO_DEPOSIT)).sub(fee)
      .toString()).to.equal(balance2.toString());

    ({gasUsed} = await retire(node, ROLE_CODES.APOLLO, pool, {gasPrice}));
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
