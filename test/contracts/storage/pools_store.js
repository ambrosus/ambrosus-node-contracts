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

  it('isPool, addPool, removePool', async () => {
    expect(await isPool(pool)).to.equal(false);

    await assert.isReverted(addPool(ZERO_ADDRESS));

    let receipt = await addPool(pool);
    expect(receipt).to.have.deep.nested.property('events.PoolAdded.returnValues', {
      0: pool,
      poolAddress: pool
    });
    expect(await isPool(pool)).to.equal(true);
    await assert.isReverted(addPool(pool));

    receipt = await removePool(pool);
    expect(receipt).to.have.deep.nested.property('events.PoolRemoved.returnValues', {
      0: pool,
      poolAddress: pool
    });
    expect(await isPool(pool)).to.equal(false);
    await assert.isReverted(removePool(pool));
  });
});
