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

import PoolsJson from '../../../src/contracts/Pool.json';


chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Pool', () => {
  let web3;
  let from;
  let other;
  let snapshotId;

  let pool;
  let poolsNodesManager;

  before(async () => {
    web3 = await createWeb3();
    [from, other] = await web3.eth.getAccounts();

    ({poolsNodesManager} = await deploy({
      web3,
      contracts: {
        poolsNodesStorage: true,
        poolsNodesManager: true
      }
    }));

    pool = await deployContract(web3, PoolsJson, ['1', 10, 1, poolsNodesManager.address], {value: 10});
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('stake', async () => {
    it('stake ok', async () => {
      // todo split test

      await poolsNodesManager.methods.addPool(pool.address).send({from});

      // todo doesn't work
      await pool.methods.stake().send({value: 10000000000000, from}); // 1 token for this price
      // expect(await pool.methods.viewStake().send({from})).to.be.equal(1);
      //
      // const nodeInfo = await pool._nodes(0);
      // const node = await ethers.getContractAt('PoolNode', nodeInfo.node);
      //
      // // node transfers all of its ether to the pool
      // const poolBalance = await pool.signer.getBalance();
      //
      // await ownerS.sendTransaction({to: node.address, value: 10000});
      // await pool.stake({value: 2000000000000000000n}); // 1 token for this price
      //
      // expect(await pool.viewStake()).to.be.equal(2);
      //
      // const poolBalance2 = await pool.signer.getBalance();
      // expect(poolBalance2.sub(poolBalance)).to.be.equal(-2000544213264334396n); // why?
    });
  });

  it('fee', async () => {
    expect(await pool.methods.getFee().call()).to.be.equal('0');
    await expect(pool.methods.setFee(10).send({other})).to.be.rejected;
    await pool.methods.setFee(10).send({from});
    expect(await pool.methods.getFee().call()).to.be.equal('10');
  });
});
