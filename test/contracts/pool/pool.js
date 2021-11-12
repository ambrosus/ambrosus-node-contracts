/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/* eslint-disable prefer-arrow-callback, no-underscore-dangle, no-unused-vars */

import {expect, assert} from '../../helpers/chaiPreconf';
import deploy from '../../helpers/deploy';
import {createWeb3, makeSnapshot, restoreSnapshot, deployContract, DEFAULT_GAS} from '../../../src/utils/web3_tools';
import PoolToken from '../../../src/contracts/PoolToken.json';
import Pool from '../../../src/contracts/Pool.json';
import {ROLE_CODES, APOLLO_DEPOSIT} from '../../../src/constants';
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

const FIXEDPOINT = toBN('1000000000000000000'); // 1 ether
const MILLION = toBN('1000000');
const ZERO = toBN(0);
const ONE = toBN(1);
const gasPrice = ONE;

describe('Pool Contract', function() {
  let web3;
  let owner;
  let initialApollo;
  let service;
  let node1;
  let node2;
  let addr1;
  let addr2;

  let snapshotId;

  let poolsNodesManager;
  let poolEventsEmitter;
  let poolToken;
  let head;

  const apolloPoolNodeStake = toBN(APOLLO_DEPOSIT);
  const apolloPoolMinStake = toBN(Math.floor(APOLLO_DEPOSIT / 1000));

  before(async function() {
    web3 = await createWeb3();
    web3.eth.handleRevert = true;
    [owner, initialApollo, service, node1, node2, addr1, addr2] = await web3.eth.getAccounts();

    ({poolsNodesManager, poolEventsEmitter, head} = await deploy({
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

  beforeEach(async function() {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async function() {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('Apollo pool with 20% fee', function() {
    const poolFee = MILLION.div(toBN(5)); // 20%

    describe('deploy', function() {
      it('success', async function() {
        const poolContract = await deployContract(web3, Pool, ['Apollo20', ROLE_CODES.APOLLO, apolloPoolNodeStake, apolloPoolMinStake, poolFee, service, head.options.address]);
        expect(poolContract).to.be.instanceof(web3.eth.Contract);

        // todo: check public vars initial state?
      });

      it('is payable', async () => {
        const poolContract = await deployContract(web3, Pool, ['Apollo20', ROLE_CODES.APOLLO, apolloPoolNodeStake, apolloPoolMinStake, poolFee, service, head.options.address]);
        const {status} = await web3.eth.sendTransaction({from:owner, to:poolContract.options.address, value:ONE, gas:DEFAULT_GAS});
        expect(status).to.be.true;
      });

      it('reverts when minimum stake value is zero', async function() {
        try {
          await deployContract(web3, Pool, ['Apollo20', ROLE_CODES.APOLLO, apolloPoolNodeStake, 0, poolFee, service, head.options.address]);
          throw new Error('deploy successful');
        } catch (err) {
          if (!err.message.match(/revert/)) {
            throw err;
          }
        }
      });

      // reverts when service is zero
      // reverts when head is zero
    });

    describe('when pool deployed', function() {
      let snapshotId_;
      let poolContract;

      before(async function() {
        snapshotId_ = await makeSnapshot(web3);
        poolContract = await deployContract(web3, Pool, ['Apollo20', ROLE_CODES.APOLLO, apolloPoolNodeStake, apolloPoolMinStake, poolFee, service, head.options.address]);
      });
      after(async function() {
        await restoreSnapshot(web3, snapshotId_);
      });

      // todo: check ownable
      // todo: setService reverts when sender is not an owner
      // todo: addNode reverts when sender is not service
      // todo: onlyPoolsCalls

      describe('when pool added to manager', function() {
        let snapshotId_;
        before(async function() {
          snapshotId_ = await makeSnapshot(web3);
          await poolsNodesManager.methods.addPool(poolContract.options.address).send({from:owner});
        });
        after(async function() {
          await restoreSnapshot(web3, snapshotId_);
        });

        describe('when pool not activated', function() {
          describe('activation', function() {
            it('success', async function() {
              const {status} = await poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake});
              expect(status).to.be.true;
            });
            it('owner stake locked', async function() {
              const balanceBeforeActivation = toBN(await web3.eth.getBalance(owner));
              const {gasUsed} = await poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake, gasPrice});
              const fee = gasPrice.mul(toBN(gasUsed));
              expect(await web3.eth.getBalance(owner)).to.equal(
                balanceBeforeActivation
                  .sub(apolloPoolNodeStake)
                  .sub(fee)
                  .toString()
              );
            });
            it('reverts when sender not an owner', async function() {
              await assert.isReverted(poolContract.methods.activate().send({from:addr1, value:apolloPoolNodeStake}));
            });
            it('reverts when sent value not equals node stake value', async function() {
              await assert.isReverted(poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake.add(ONE)}));
            });
          });

          it('deactivation reverts', async function() {
            await assert.isReverted(poolContract.methods.deactivate().send({from:owner}));
          });
          it('stake reverts', async function() {
            await assert.isReverted(poolContract.methods.stake().send({from:owner, value:apolloPoolMinStake}));
          });
        });

        describe('when pool activated', function() {
          let snapshotId_;
          before(async function() {
            snapshotId_ = await makeSnapshot(web3);
            await poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake});
          });
          after(async function() {
            await restoreSnapshot(web3, snapshotId_);
          });

          it('activation reverts', async function() {
            await assert.isReverted(poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake}));
          });

          it('pool balance equals node stake', async function() {
            expect(await web3.eth.getBalance(poolContract.options.address)).to.equal(apolloPoolNodeStake.toString());
          });

          describe('deactivation', function() {
            it('success', async function() {
              const {status} = await poolContract.methods.deactivate().send({from:owner});
              expect(status).to.be.true;
            });
            it('owner stake returned', async function() {
              const balanceBeforeDeactivation = toBN(await web3.eth.getBalance(owner));
              const {gasUsed} = await poolContract.methods.deactivate().send({from:owner, gasPrice});
              const fee = gasPrice.mul(toBN(gasUsed));
              expect(await web3.eth.getBalance(owner)).to.equal(
                balanceBeforeDeactivation
                  .add(apolloPoolNodeStake)
                  .sub(fee)
                  .toString()
              );
            });
            it('reverts when sender not an owner', async function() {
              await assert.isReverted(poolContract.methods.deactivate().send({from:addr1}));
            });
          });
        });
      });
    });

    describe('staking tests', function() {
      describe('pool activated (1 node onboarded)', function() {
        let poolContract;

        let staker1;
        let staker2;

        let stake;
        let unstake;
        let deactivate;
        let viewStake;
        let getNodesCount;
        let balanceOf;
        let transfer;
        let getTotalStake;
        let getTokenPrice;
        let addNode;
        let addReward;

        let snapshotId_;


        async function checkTx(addr, balanceChange, stakeChange, poolBalanceChange, priceChange, txFn) {
          // todo: add totalStakeChange
          //  stake in amb ??

          const pool = poolContract.options.address;
          const poolBalanceBefore =  toBN(await web3.eth.getBalance(pool));
          const balanceBefore = toBN(await web3.eth.getBalance(addr));
          const stakeBefore = toBN(await viewStake(addr));
          const priceBefore = toBN(await getTokenPrice());
          const {gasUsed} = await txFn();
          const fee = toBN(gasUsed).mul(gasPrice);
          const poolBalanceAfter =  toBN(await web3.eth.getBalance(pool));
          const balanceAfter = toBN(await web3.eth.getBalance(addr));
          const stakeAfter = toBN(await viewStake(addr));
          const priceAfter = toBN(await getTokenPrice());
          /*
          console.log('balanceBefore', balanceBefore.toString());
          console.log('balanceAfter', balanceAfter.toString());
          console.log('fee', fee.toString());
          console.log('balanceChange', balanceChange.toString());
          console.log('diff', balanceAfter.sub(balanceBefore.add(balanceChange).sub(fee)).toString());
          console.log('price', priceBefore.toString(), priceAfter.toString());
          */
          // eslint-disable-next-line newline-per-chained-call
          expect(balanceBefore.add(toBN(balanceChange)).sub(fee).toString()).to.equal(balanceAfter.toString());
          expect(stakeBefore.add(toBN(stakeChange)).toString()).to.equal(stakeAfter.toString());
          expect(poolBalanceBefore.add(toBN(poolBalanceChange)).toString()).to.equal(poolBalanceAfter.toString());
          expect(priceAfter.sub(priceBefore.add(toBN(priceChange))).lte(ONE)).to.equal(true);
        }

        before(async function() {
          snapshotId_ = await makeSnapshot(web3);

          poolContract = await deployContract(web3, Pool, ['Apollo20', ROLE_CODES.APOLLO, apolloPoolNodeStake, apolloPoolMinStake, poolFee, service, head.options.address]);
          await poolsNodesManager.methods.addPool(poolContract.options.address).send({from:owner});
          await poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake});

          stake = (senderAddress = owner, options = {}) => poolContract.methods.stake().send({from: senderAddress, gasPrice, ...options});
          unstake = (tokens, senderAddress = owner, options = {}) => poolContract.methods.unstake(tokens).send({from: senderAddress, gasPrice, ...options});
          deactivate = (senderAddress = owner) => poolContract.methods.deactivate().send({from: senderAddress, gasPrice});
          viewStake = (senderAddress = owner) => poolContract.methods.viewStake().call({from: senderAddress});
          getNodesCount = (senderAddress = owner) => poolContract.methods.getNodesCount().call({from: senderAddress});

          getTotalStake = (senderAddress = owner) => poolContract.methods.totalStake().call({from: senderAddress});
          getTokenPrice = (senderAddress = owner) => poolContract.methods.getTokenPrice().call({from: senderAddress});

          addNode = (requestId, node, nodeId, senderAddress = owner) => poolContract.methods.addNode(requestId, node, nodeId).send({from: senderAddress, gasPrice});
          addReward = (senderAddress = owner, options = {}) => poolContract.methods.addReward().send({from: senderAddress, gasPrice, ...options});

          const poolTokenAddr = await poolContract.methods.token().call({from:owner});
          poolToken = new web3.eth.Contract(PoolToken.abi, poolTokenAddr);
          balanceOf = (_who, senderAddress = owner) => poolToken.methods.balanceOf(_who).call({from: senderAddress});
          transfer = (_to, _value, senderAddress = owner) => poolToken.methods.transfer(_to, _value).send({from: senderAddress, gasPrice});

          staker1 = addr1;
          staker2 = addr2;

          await addNode(1, node1, 0, service);
        });
        after(async function() {
          await restoreSnapshot(web3, snapshotId_);
        });

        it('revets staking less than minimum amount', async function() {
          await assert.isReverted(stake(staker1, {value:apolloPoolMinStake.sub(ONE)}));
        });
        it('successful staking minimum amount', async function() {
          const stakedAmount = apolloPoolMinStake;
          await checkTx(staker1, stakedAmount.neg(), stakedAmount, stakedAmount, 0,
            () => stake(staker1, {value:stakedAmount}));
        });
        it('successful staking node stake amount', async function() {
          const stakedAmount = apolloPoolNodeStake;
          await checkTx(staker1, stakedAmount.neg(), stakedAmount, stakedAmount, 0,
            () => stake(staker1, {value:stakedAmount}));
        });
        it('successful unstaking', async function() {
          await stake(staker1, {value:apolloPoolMinStake});
          await checkTx(staker1, apolloPoolMinStake, apolloPoolMinStake.neg(), apolloPoolMinStake.neg(), 0,
            () => unstake(apolloPoolMinStake, staker1));
        });
        it('stake emitted PoolStakeChanged event with correct values', async function() {
          const stakedAmount = apolloPoolMinStake;
          const {blockNumber} = await stake(staker1, {value:stakedAmount});
          await checkEvent(poolEventsEmitter, 'PoolStakeChanged', blockNumber, {
            pool: poolContract.options.address,
            user: staker1,
            stake: stakedAmount.toString(),
            tokens: stakedAmount.toString()
          });
        });
        it('unstake emitted PoolStakeChanged event with correct values', async function() {
          const stakedAmount = apolloPoolMinStake;
          await stake(staker1, {value:stakedAmount});
          const {blockNumber} = await unstake(stakedAmount, staker1);
          await checkEvent(poolEventsEmitter, 'PoolStakeChanged', blockNumber, {
            pool: poolContract.options.address,
            user: staker1,
            stake: stakedAmount.neg().toString(),
            tokens: stakedAmount.neg().toString()
          });
        });

        describe('one staker', function() {
          it('stake1 unstake1', async function() {
            await checkTx(staker1, apolloPoolMinStake.neg(), apolloPoolMinStake, apolloPoolMinStake, 0,
              () => stake(staker1, {value:apolloPoolMinStake}));
            await checkTx(staker1, apolloPoolMinStake, apolloPoolMinStake.neg(), apolloPoolMinStake.neg(), 0,
              () => unstake(apolloPoolMinStake, staker1));
          });
          it('stake1 unstake1 stake1 unstake1', async function() {
            const stakeAmount = apolloPoolMinStake.add(apolloPoolNodeStake);
            await checkTx(staker1, stakeAmount.neg(), stakeAmount, stakeAmount, 0,
              () => stake(staker1, {value:stakeAmount}));
            await checkTx(staker1, stakeAmount, stakeAmount.neg(), stakeAmount.neg(), 0,
              () => unstake(stakeAmount, staker1));
            await checkTx(staker1, stakeAmount.neg(), stakeAmount, stakeAmount, 0,
              () => stake(staker1, {value:stakeAmount}));
            await checkTx(staker1, stakeAmount, stakeAmount.neg(), stakeAmount.neg(), 0,
              () => unstake(stakeAmount, staker1));
          });
          it('stake1 stake1 unstake1', async function() {
            await checkTx(staker1, apolloPoolMinStake.neg(), apolloPoolMinStake, apolloPoolMinStake, 0,
              () => stake(staker1, {value:apolloPoolMinStake}));
            await checkTx(staker1, apolloPoolNodeStake.neg(), apolloPoolNodeStake, apolloPoolNodeStake, 0,
              () => stake(staker1, {value:apolloPoolNodeStake}));
            await checkTx(staker1, apolloPoolMinStake.add(apolloPoolNodeStake), apolloPoolMinStake.add(apolloPoolNodeStake).neg(), apolloPoolMinStake.add(apolloPoolNodeStake).neg(), 0,
              () => unstake(apolloPoolMinStake.add(apolloPoolNodeStake), staker1));
          });
          it('stake1 unstake1-part unstake1', async function() {
            await checkTx(staker1, apolloPoolMinStake.neg(), apolloPoolMinStake, apolloPoolMinStake, 0,
              () => stake(staker1, {value:apolloPoolMinStake}));
            const halfStake = apolloPoolMinStake.div(toBN(2));
            await checkTx(staker1, halfStake, halfStake.neg(), halfStake.neg(), 0,
              () => unstake(halfStake, staker1));
            await checkTx(staker1, halfStake, halfStake.neg(), halfStake.neg(), 0,
              () => unstake(halfStake, staker1));
          });
          it('stake1 unstake1-part stake1 unstake1', async function() {
            await checkTx(staker1, apolloPoolMinStake.neg(), apolloPoolMinStake, apolloPoolMinStake, 0,
              () => stake(staker1, {value:apolloPoolMinStake}));
            const halfStake = apolloPoolMinStake.div(toBN(2));
            await checkTx(staker1, halfStake, halfStake.neg(), halfStake.neg(), 0,
              () => unstake(halfStake, staker1));
            await checkTx(staker1, apolloPoolMinStake.neg(), apolloPoolMinStake, apolloPoolMinStake, 0,
              () => stake(staker1, {value:apolloPoolMinStake}));
            await checkTx(staker1, halfStake.add(apolloPoolMinStake), halfStake.add(apolloPoolMinStake).neg(), halfStake.add(apolloPoolMinStake).neg(), 0,
              () => unstake(halfStake.add(apolloPoolMinStake), staker1));
          });
        });
        describe('two stakers', function() {
          it('stake1 stake2 unstake1 unstake2', async function() {
            await checkTx(staker1, apolloPoolMinStake.neg(), apolloPoolMinStake, apolloPoolMinStake, 0,
              () => stake(staker1, {value:apolloPoolMinStake}));
            await checkTx(staker2, apolloPoolNodeStake.neg(), apolloPoolNodeStake, apolloPoolNodeStake, 0,
              () => stake(staker2, {value:apolloPoolNodeStake}));
            await checkTx(staker1, apolloPoolMinStake, apolloPoolMinStake.neg(), apolloPoolMinStake.neg(), 0,
              () => unstake(apolloPoolMinStake, staker1));
            await checkTx(staker2, apolloPoolNodeStake, apolloPoolNodeStake.neg(), apolloPoolNodeStake.neg(), 0,
              () => unstake(apolloPoolNodeStake, staker2));
          });
          it('stake1 transfer(from 1 to 2) unstake2', async function() {
            await checkTx(staker1, apolloPoolMinStake.neg(), apolloPoolMinStake, apolloPoolMinStake, 0,
              () => stake(staker1, {value:apolloPoolMinStake}));
            await transfer(staker2, apolloPoolMinStake, staker1);
            expect(await viewStake(staker1)).to.equal('0');
            expect(await viewStake(staker2)).to.equal(apolloPoolMinStake.toString());
            await checkTx(staker2, apolloPoolMinStake, apolloPoolMinStake.neg(), apolloPoolMinStake.neg(), 0,
              () => unstake(apolloPoolMinStake, staker2));
          });
        });

        // todo: 0 nodes
        // todo: addReward sent not from a node

        function calcPoolReward(reward, totalStake) {
          const ownerStake = apolloPoolNodeStake.sub(totalStake.mod(apolloPoolNodeStake));
          let poolReward = ownerStake === apolloPoolNodeStake ? 0 : reward.sub(reward.mul(ownerStake).div(apolloPoolNodeStake));
          if (poolReward.gt(ZERO) && poolFee.gt(ZERO)) {
            poolReward = poolReward.sub(poolReward.mul(poolFee).div(MILLION));
          }
          return poolReward;
        }

        describe('reward', function() {
          it('reward deactivate(retire)', async function() {
            const reward = ONE.mul(FIXEDPOINT);
            const ownerBalanceBefore = toBN(await web3.eth.getBalance(owner));
            await checkTx(node1, reward.neg(), 0, 0, 0,
              () => addReward(node1, {value:reward}));
            expect(ownerBalanceBefore.add(reward).toString()).to.equal(await web3.eth.getBalance(owner));
            await checkTx(owner, apolloPoolNodeStake, 0, 0, 0,
              () => deactivate());
          });
          it('stake1 reward unstake1 deactivate(retire)', async function() {
            const stakedAmount = apolloPoolMinStake;
            const receivedTokens = stakedAmount;
            await checkTx(staker1, stakedAmount.neg(), receivedTokens, stakedAmount, 0,
              () => stake(staker1, {value:stakedAmount}));
            const totalStake = stakedAmount;
            const reward = apolloPoolMinStake;
            const poolReward = calcPoolReward(reward, totalStake);
            const priceChange = poolReward.mul(FIXEDPOINT).div(totalStake);
            const ownerBalanceBefore = toBN(await web3.eth.getBalance(owner));
            await checkTx(node1, reward.neg(), 0, poolReward, priceChange,
              () => addReward(node1, {value:reward}));
            expect(ownerBalanceBefore.add(reward.sub(poolReward)).toString()).to.equal(await web3.eth.getBalance(owner));

            // isReverted deactivate

            const price = toBN(await getTokenPrice());
            const ambStake = stakedAmount.mul(price).div(FIXEDPOINT);
            await checkTx(staker1, ambStake, apolloPoolMinStake.neg(), ambStake.neg(), ONE.mul(FIXEDPOINT).sub(price),
              () => unstake(receivedTokens, staker1));
            await checkTx(owner, apolloPoolNodeStake, 0, 0, 0,
              () => deactivate());
          });
          it('stake1 reward (100 times)', async function() {
            async function checkReward()  {
              const totalStake = toBN(await getTotalStake());
              const reward = apolloPoolMinStake;
              const poolReward = calcPoolReward(reward, totalStake);
              const price = toBN(await getTokenPrice());
              const totalTokens = totalStake.mul(FIXEDPOINT).div(price);
              const priceChange = poolReward.mul(FIXEDPOINT).div(totalTokens);
              const ownerBalanceBefore = toBN(await web3.eth.getBalance(owner));
              await checkTx(node1, reward.neg(), 0, poolReward, priceChange,
                () => addReward(node1, {value:reward}));
              expect(ownerBalanceBefore.add(reward.sub(poolReward)).toString()).to.equal(await web3.eth.getBalance(owner));
            }

            const stakedAmount = apolloPoolMinStake;
            for (let ix = 0; ix < 10; ix++) {
              const price = toBN(await getTokenPrice());
              const receivedTokens = stakedAmount.mul(FIXEDPOINT).div(price);
              await checkTx(staker1, stakedAmount.neg(), receivedTokens, stakedAmount, 0,
                // eslint-disable-next-line no-loop-func
                () => stake(staker1, {value:stakedAmount}));
              for (let jx = 0; jx < 10; jx++) {
                await checkReward();
              }
            }
          });
        });
        describe('onboard / retire', function() {
          it('stake1 onboard(AddNodeRequest addNode AddNodeRequestResolved(1)) unstake1(retire) deactivate(retire)', async function() {
            const id = '2';
            const nodeId = '1';
            const pool = poolContract.options.address;
            let {blockNumber} = await stake(staker1, {value:apolloPoolNodeStake});
            await checkEvent(poolEventsEmitter, 'AddNodeRequest', blockNumber, {
              pool,
              id,
              nodeId,
              stake: apolloPoolNodeStake.toString(),
              role: ROLE_CODES.APOLLO
            });
            ({blockNumber} = await addNode(id, node2, nodeId, service));
            await checkEvent(poolEventsEmitter, 'AddNodeRequestResolved', blockNumber, {
              pool,
              id,
              status: '1'
            });
            expect(await getNodesCount()).to.equal('2');
            await checkTx(staker1, apolloPoolNodeStake, apolloPoolNodeStake.neg(), 0, 0,
              () => unstake(apolloPoolNodeStake, staker1));
            expect(await getNodesCount()).to.equal('1');
            const poolBalance = toBN(await web3.eth.getBalance(poolContract.options.address));
            await checkTx(owner, apolloPoolNodeStake.add(poolBalance), 0, poolBalance.neg(), 0,
              () => deactivate());
          });
          it('stake1 onboard(AddNodeRequest unstake1 addNode AddNodeRequestResolved(0))', async function() {
            const id = '2';
            const nodeId = '1';
            const pool = poolContract.options.address;
            let {blockNumber} = await stake(staker1, {value:apolloPoolNodeStake});
            await checkEvent(poolEventsEmitter, 'AddNodeRequest', blockNumber, {
              pool,
              id,
              nodeId,
              stake: apolloPoolNodeStake.toString(),
              role: ROLE_CODES.APOLLO
            });
            await unstake(apolloPoolNodeStake, staker1);
            ({blockNumber} = await addNode(id, node2, nodeId, service));
            await checkEvent(poolEventsEmitter, 'AddNodeRequestResolved', blockNumber, {
              pool,
              id,
              status: '0'
            });
          });
          it('stake1 stake2 reward onboard unstake1 unstake2(retire) deactivate(retire)', async function() {
            await stake(staker1, {value:apolloPoolMinStake});
            await stake(staker2, {value:apolloPoolNodeStake.div(toBN(2))});
            const totalStake = toBN(await getTotalStake());

            // calculate reward size so that poolReward equals apolloPoolNodeStake
            const reward = apolloPoolNodeStake.mul(MILLION).div(calcPoolReward(MILLION, totalStake));
            const poolReward = calcPoolReward(reward, totalStake);
            expect(poolReward.toString()).to.equal(apolloPoolNodeStake.toString());
            const priceChange = poolReward.mul(FIXEDPOINT).div(totalStake);

            const ownerBalanceBefore = toBN(await web3.eth.getBalance(owner));
            await checkTx(node1, reward.neg(), 0, poolReward, priceChange,
              () => addReward(node1, {value:reward}));

            expect(ownerBalanceBefore.add(reward.sub(poolReward)).toString()).to.equal(await web3.eth.getBalance(owner));

            await addNode(2, node2, 1, service);
            expect(await getNodesCount()).to.equal('2');

            await unstake(await viewStake(staker1), staker1);
            expect(await getNodesCount()).to.equal('2');
            await unstake(await viewStake(staker2), staker2);
            expect(await getNodesCount()).to.equal('1');

            await checkTx(owner, apolloPoolNodeStake, 0, 0, 0,
              () => deactivate());
          });
        });
      });
    });
  });
});
