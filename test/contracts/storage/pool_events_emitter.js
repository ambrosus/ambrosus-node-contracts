/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {expect} from '../../helpers/chaiPreconf';
import deploy from '../../helpers/deploy';
import {makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import {createWeb3Ganache} from '../../utils/web3_tools';
import {ROLE_CODES} from '../../../src/constants';

describe('PoolEventsEmitter Contract', () => {
  let web3;
  let owner;
  let pool;
  let user;

  let snapshotId;

  let poolEventsEmitter;

  const poolStakeChanged = (pool, user, stake, tokens, senderAddress = owner) => poolEventsEmitter.methods.poolStakeChanged(pool, user, stake, tokens).send({from: senderAddress});
  const poolReward = (pool, reward, tokenPrice, senderAddress = owner) => poolEventsEmitter.methods.poolReward(pool, reward, tokenPrice).send({from: senderAddress});
  const addNodeRequest = (pool, id, nodeId, stake, role, senderAddress = owner) => poolEventsEmitter.methods.addNodeRequest(pool, id, nodeId, stake, role).send({from: senderAddress});
  const addNodeRequestResolved = (pool, id, status, senderAddress = owner) => poolEventsEmitter.methods.addNodeRequestResolved(pool, id, status).send({from: senderAddress});

  before(async () => {
    web3 = await createWeb3Ganache();
    web3.eth.handleRevert = true;
    [owner, pool, user] = await web3.eth.getAccounts();

    ({poolEventsEmitter} = await deploy({
      web3,
      contracts: {
        poolEventsEmitter: true
      }
    }));
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  it('poolStakeChanged, poolReward, addNodeRequest, addNodeRequestResolved', async () => {
    const one = '1000000000000000000';
    let receipt = await poolStakeChanged(pool, user, one, one);
    expect(receipt).to.have.deep.nested.property('events.PoolStakeChanged.returnValues', {
      0: pool,
      1: user,
      2: one,
      3: one,
      pool,
      user,
      stake: one,
      tokens: one
    });

    receipt = await poolReward(pool, one, one);
    expect(receipt).to.have.deep.nested.property('events.PoolReward.returnValues', {
      0: pool,
      1: one,
      2: one,
      pool,
      reward: one,
      tokenPrice: one
    });

    receipt = await addNodeRequest(pool, '1', '2', one, ROLE_CODES.APOLLO);
    expect(receipt).to.have.deep.nested.property('events.AddNodeRequest.returnValues', {
      0: pool,
      1: '1',
      2: '2',
      3: one,
      4: ROLE_CODES.APOLLO,
      pool,
      id: '1',
      nodeId: '2',
      stake: one,
      role: ROLE_CODES.APOLLO
    });

    receipt = await addNodeRequestResolved(pool, '1', '2');
    expect(receipt).to.have.deep.nested.property('events.AddNodeRequestResolved.returnValues', {
      0: pool,
      1: '1',
      2: '2',
      pool,
      id: '1',
      status: '2'
    });
  });
});
