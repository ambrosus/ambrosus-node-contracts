/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {expect, assert} from '../../helpers/chaiPreconf';
import deploy from '../../helpers/deploy';
import {createWeb3, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import {ZERO_ADDRESS} from '../../../src/constants';

describe('PoolsStore Contract', () => {
  let web3;
  let owner;
  let pool;

  let snapshotId;

  let poolsStore;

  const addPool = (pool, senderAddress = owner) => poolsStore.methods.addPool(pool).send({from: senderAddress});
  const removePool = (pool, senderAddress = owner) => poolsStore.methods.removePool(pool).send({from: senderAddress});
  const isPool = (pool, senderAddress = owner) => poolsStore.methods.isPool(pool).call({from: senderAddress});

  const getPoolsCount = (senderAddress = owner) => poolsStore.methods.getPoolsCount().call({from: senderAddress});
  const getPools = (from, to, senderAddress = owner) => poolsStore.methods.getPools(from, to).call({from: senderAddress});

  before(async () => {
    web3 = await createWeb3();
    web3.eth.handleRevert = true;
    [owner, pool] = await web3.eth.getAccounts();

    ({poolsStore} = await deploy({
      web3,
      contracts: {
        poolsStore: true
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
    const nextId = poolsStore.methods.nextId();
    expect(await nextId.call({from: owner})).to.equal('1');
    await nextId.send({from: owner});
    expect(await nextId.call({from: owner})).to.equal('2');
  });

  async function checkPools(pools) {
    const poolsCount = parseInt(await getPoolsCount(), 10);
    //expect(poolsCount).to.equal(pools.length);
    if (!poolsCount) {
      return;
    }
    for (const pool of pools) {
      expect(await isPool(pool)).to.equal(true);
    }
    const poolsFromContract = await getPools(0, poolsCount);
    expect(poolsFromContract).to.be.an('array');
    expect(poolsFromContract).to.deep.equal(pools);
  }

  it('isPool, addPool, removePool with events', async () => {
    expect(await isPool(pool)).to.equal(false);

    const pools = [];
    await checkPools(pools);

    // try add address(0) as a pool
    await assert.isReverted(addPool(ZERO_ADDRESS));

    // add pool
    let receipt = await addPool(pool);
    expect(receipt).to.have.deep.nested.property('events.PoolAdded.returnValues', {
      0: pool,
      poolAddress: pool
    });
    pools.push(pool);
    await checkPools(pools);

    // try add already existed pool
    await assert.isReverted(addPool(pool));

    // remove pool
    receipt = await removePool(pool);
    expect(receipt).to.have.deep.nested.property('events.PoolRemoved.returnValues', {
      0: pool,
      poolAddress: pool
    });
    pools.pop();
    await checkPools(pools);

    // try remove already removed pool
    await assert.isReverted(removePool(pool));

    // add pool again
    receipt = await addPool(pool);
    expect(receipt).to.have.deep.nested.property('events.PoolAdded.returnValues', {
      0: pool,
      poolAddress: pool
    });
    pools.push(pool);
    await checkPools(pools);
  });

  // todo: try add/remove several pools
});
