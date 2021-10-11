/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/* eslint-disable */

import {expect, assert} from '../../helpers/chaiPreconf';
import deploy from '../../helpers/deploy';
import {createWeb3, makeSnapshot, restoreSnapshot, deployContract} from '../../../src/utils/web3_tools';
//import PoolNode from '../../../src/contracts/PoolNode.json';
//import PoolTest from '../../../src/contracts/PoolTest.json';
import PoolToken from '../../../src/contracts/PoolToken.json';
import Pool from '../../../src/contracts/Pool.json';
import {ROLE_CODES, ZERO_ADDRESS, APOLLO_DEPOSIT} from '../../../src/constants';
import {utils} from 'web3';

const {toBN} = utils;

const FIXEDPOINT = toBN('1000000000000000000'); // 1 ether
const MILLION = toBN('1000000');
const ZERO = toBN(0);
const ONE = toBN(1);
const gasPrice = ONE;

async function printReason(promise) {
  try {
    await promise;
    console.log('OK');
  } catch(err) {console.log(err.message.split('\n')[0], err.reason)}
}

let staker1;
let staker2;

describe('Pool Contract', function() {
  let web3;
  let owner;
  let initialApollo;
  let service;
  let node1;
  let node2;
  let node3;
  let addr1;
  let addr2;
  let addr3;
  let addr4;

  //let node;
  //let manager;
  //let pool;

  let snapshotId;
  const scope = 0;

  //let poolApollo;
  //let poolAtlas;
  let poolsNodesManager;
  let poolsStore;
  //let poolNode;
  //let poolTest;
  let poolToken;
  let context;

  //let poolFee = 0;

  const apolloPoolNodeStake = toBN(APOLLO_DEPOSIT);
  const apolloPoolMinStake = toBN(Math.floor(APOLLO_DEPOSIT/1000));

  //const activate = (senderAddress = owner, options = {}) => poolApollo.methods.activate().send({from: senderAddress, ...options});
  //const deactivate = (senderAddress = owner, options = {}) => poolApollo.methods.deactivate().send({from: senderAddress, ...options});

  //const addPool = (pool, senderAddress = owner) => poolsNodesManager.methods.addPool(pool).send({from: senderAddress});

  //const addToWhitelist = (addrs, senderAddress = owner) => context.methods.addToWhitelist(addrs).send({from: senderAddress});
  
  //const addNode = (node, pool, nodeType, senderAddress = owner) => poolsNodesStorage.methods.addNode(node, pool, nodeType).send({from: senderAddress});

  //const balanceOf = (_who, senderAddress = owner) => poolToken.methods.balanceOf(_who).call({from: senderAddress});
  
  
  before(async function() {
    web3 = await createWeb3();
    web3.eth.handleRevert = true;
    [owner, initialApollo, service, node1, node2, node3, addr1, addr2, addr3, addr4] = await web3.eth.getAccounts();

    ({poolsNodesManager, poolsStore, context} = await deploy({
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

    //poolNode = await deployContract(web3, PoolNode, [poolsNodesStorage.options.address]);
    //poolTest = await deployContract(web3, PoolTest);

    //poolApollo = await deployContract(web3, Pool, [ROLE_CODES.APOLLO, apolloNodeStake, apolloMinStake, poolFee, poolsNodesManager.options.address]);
    //poolAtlas  = await deployContract(web3, Pool, [ROLE_CODES.ATLAS,  apolloNodeStake, apolloMinStake, poolFee, poolsNodesManager.options.address]);

    //await addToWhitelist([poolTest.options.address]);
    // await addToWhitelist([poolContr.options.address]);

    //node = poolNode.options.address;
    //manager = poolsNodesManager.options.address;
    //pool = poolApollo.options.address;

  
  });
  //snap1

  beforeEach(async function() {
    snapshotId = await makeSnapshot(web3);
    //console.log("*makeSnapshot",snapshotId);
  });

  afterEach(async function() {
    //console.log("*restoreSnapshot",snapshotId);
    await restoreSnapshot(web3, snapshotId);
  });

  // todo: check events !!!

  describe('Apollo pool with 20% fee', function() {
    const poolFee = MILLION.div(toBN(5)); // 20%

    describe('deploy', function() {
      it('success', async function() {
        const poolContract = await deployContract(web3, Pool, [ROLE_CODES.APOLLO, apolloPoolNodeStake, apolloPoolMinStake, poolFee, poolsNodesManager.options.address, service]);
        expect(poolContract).to.be.instanceof(web3.eth.Contract);

        // todo: check public vars initial state?
      });

      it('is payable', async () => {
        const poolContract = await deployContract(web3, Pool, [ROLE_CODES.APOLLO, apolloPoolNodeStake, apolloPoolMinStake, poolFee, poolsNodesManager.options.address, service]);
        const {status} = await web3.eth.sendTransaction({from:owner, to:poolContract.options.address, value:'1', gas:'1000000'});
        expect(status).to.be.true;
      })

      it('reverts when minimum stake value is zero', async function() {
        try {
          await deployContract(web3, Pool, [ROLE_CODES.APOLLO, apolloPoolNodeStake, 0, poolFee, poolsNodesManager.options.address, service]);
          throw new Error('deploy successful');
        } catch (err) {
          if (!err.message.match(/revert/)) throw err;
        }
      });

      it('reverts when manager address is zero', async function() {
        try {
          await deployContract(web3, Pool, [ROLE_CODES.APOLLO, apolloPoolNodeStake, apolloPoolMinStake, poolFee, ZERO_ADDRESS, service]);
          throw new Error('deploy successful');
        } catch (err) {
          if (!err.message.match(/revert/)) throw err;
        }
      });
    });

    describe('when pool deployed', function() {
      let snapshotId_;
      let poolContract;

      before(async function() {
        snapshotId_ = await makeSnapshot(web3);
        //console.log("**before1",snapshotId_, await web3.eth.getBalance(addr4));
        poolContract = await deployContract(web3, Pool, [ROLE_CODES.APOLLO, apolloPoolNodeStake, apolloPoolMinStake, poolFee, poolsNodesManager.options.address, service]);
        //await web3.eth.sendTransaction({from:owner, to:addr4, value:'1', gasPrice:'1', gas:'1000000'});
        await poolsNodesManager.methods.addPool(poolContract.options.address).send({from:owner});
      });
      //snap11
      after(async function() {
        await restoreSnapshot(web3,snapshotId_);
      });
      //it('************************ 02', async function() {
      //  console.log("**1", await web3.eth.getBalance(addr4));
      //});

      it('service', async function() {
        // todo
      });

      describe('when pool not activated', function() {
        describe('activation', function() {
          it('success', async function() {
            const {status} = await poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake});
            expect(status).to.be.true;
            //await printReason(poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake}));
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
          //expect(await web3.eth.getBalance(poolContract.options.address)).to.equal('0');

          snapshotId_ = await makeSnapshot(web3);
          //console.log("**before111",snapshotId_, await web3.eth.getBalance(addr4));
          await poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake});
          //await web3.eth.sendTransaction({from:owner, to:addr4, value:'1', gasPrice:'1', gas:'1000000'});
        });
        //snap1111
        after(async function() {
          await restoreSnapshot(web3,snapshotId_);
        });

        //it('first node onboarded', async function() {
          //await poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake});
        //  const {stake} = await poolContract.methods.nodes(0).call({from:owner});
        //  expect(stake).to.equal(apolloPoolNodeStake.toString());
        //});
        //it('only one node onboarded', async function() {
          //await poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake});
        //  try {
        //    await poolContract.methods.nodes(1).call({from:owner});
        //    throw new Error('second node available');
        //  } catch (err) {
        //    if (!err.message.match(/Out of Gas/)) throw err;
        //  }
        //});


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
            //const gasPrice = ONE;
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


/*
      describe('when pool not added to manager', function() {
        //it('activation reverts', async function() {
        //  await assert.isReverted(poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake}));
        //});
      });

      describe('when pool added to manager', function() {
        let snapshotId_;
        before(async function() {
          snapshotId_ = await makeSnapshot(web3);
          //console.log("**before11",snapshotId_, await web3.eth.getBalance(addr4));
          await poolsNodesManager.methods.addPool(poolContract.options.address).send({from:owner});
          //await web3.eth.sendTransaction({from:owner, to:addr4, value:'1', gasPrice:'1', gas:'1000000'});
        });
        //snap111
        after(async function() {
          await restoreSnapshot(web3,snapshotId_);
        });
      });
*/
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
          expect(balanceBefore.add(toBN(balanceChange)).sub(fee).toString()).to.equal(balanceAfter.toString());
          expect(stakeBefore.add(toBN(stakeChange)).toString()).to.equal(stakeAfter.toString());
          expect(poolBalanceBefore.add(toBN(poolBalanceChange)).toString()).to.equal(poolBalanceAfter.toString());
          expect(priceBefore.add(toBN(priceChange)).toString()).to.equal(priceAfter.toString());
        }
  
        before(async function() {
          //console.log("*before1");
          snapshotId_ = await makeSnapshot(web3);

          poolContract = await deployContract(web3, Pool, [ROLE_CODES.APOLLO, apolloPoolNodeStake, apolloPoolMinStake, poolFee, poolsNodesManager.options.address, service]);
          await poolsNodesManager.methods.addPool(poolContract.options.address).send({from:owner});
          await poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake});
  
          stake = (senderAddress = owner, options = {}) => poolContract.methods.stake().send({from: senderAddress, gasPrice, ...options});
          unstake = (tokens, senderAddress = owner, options = {}) => poolContract.methods.unstake(tokens).send({from: senderAddress, gasPrice, ...options});
          deactivate = (senderAddress = owner) => poolContract.methods.deactivate().send({from: senderAddress, gasPrice});
          viewStake = (senderAddress = owner) => poolContract.methods.viewStake().call({from: senderAddress});
          getNodesCount = (senderAddress = owner) => poolContract.methods.getNodesCount().call({from: senderAddress});

          getTotalStake = (senderAddress = owner) => poolContract.methods.getTotalStake().call({from: senderAddress});
          getTokenPrice = (senderAddress = owner) => poolContract.methods.getTokenPrice().call({from: senderAddress});

          addNode = (node, senderAddress = owner) => poolContract.methods.addNode(node).send({from: senderAddress, gasPrice});
          addReward = (senderAddress = owner, options = {}) => poolContract.methods.addReward().send({from: senderAddress, gasPrice, ...options});

          const poolTokenAddr = await poolContract.methods.token().call({from:owner});
          poolToken = new web3.eth.Contract(PoolToken.abi, poolTokenAddr);
          balanceOf = (_who, senderAddress = owner) => poolToken.methods.balanceOf(_who).call({from: senderAddress});
          transfer = (_to, _value, senderAddress = owner) => poolToken.methods.transfer(_to, _value).send({from: senderAddress, gasPrice});
        
          staker1 = addr1;
          staker2 = addr2;

          await addNode(node1, service);
        });
        after(async function() {
          await restoreSnapshot(web3,snapshotId_);
        });

        it('revets staking less than minimum amount', async function() {
          await assert.isReverted(stake(staker1, {value:apolloPoolMinStake.sub(ONE)}));
        });
        it('successful staking minimum amount', async function() {
          const stakedAmount = apolloPoolMinStake;
          await checkTx(staker1, ZERO.sub(stakedAmount), stakedAmount, stakedAmount, 0,
            () => stake(staker1, {value:stakedAmount}));
        });
        it('successful staking node stake amount', async function() {
          const stakedAmount = apolloPoolNodeStake;
          await checkTx(staker1, ZERO.sub(stakedAmount), stakedAmount, stakedAmount, 0,
            () => stake(staker1, {value:stakedAmount}));
        });
        /*
        function checkUnstakingAllTokens(getStaker) {
          describe('unstaked all tokens',  function() {
            let snapshotId_;
            let staker;
            before(async function() {
              //console.log("*before111");
              snapshotId_ = await makeSnapshot(web3);
              staker = getStaker();
              await unstake(await balanceOf(staker), staker);
            });
            after(async function() {
              await restoreSnapshot(web3,snapshotId_);
            });
            it('getTotalStake equals zero', async function() {
              expect(await getTotalStake()).to.equal('0');
            });
            it('viewStake equals zero', async function() {
              expect(await viewStake(staker)).to.equal('0');
            });
            it('pool balance equals pool stake', async function() {
              expect(await web3.eth.getBalance(poolContract.options.address)).to.equal(apolloPoolNodeStake.toString());
            });
            it('getTokenPrice equals one', async function() {
              expect(await getTokenPrice(staker)).to.equal(ONE.mul(FIXEDPOINT).toString());
            });
            it('tokens balance equals zero', async function() {
              expect(await balanceOf(staker)).to.equal('0');
            });
            it('deactivation success', async function() {
              const {status} = await poolContract.methods.deactivate().send({from:owner});
              expect(status).to.be.true;
            });
          });
        }

        function checkStake(getArgs) {
          let staker, initialStake, newStake, description;
          //describe('', function() {
            //let snapshotId_;
            before(async function() {
              ([staker, initialStake, newStake, description] = getArgs());
              initialStake = toBN(initialStake);
              newStake = toBN(newStake);
              expect(await getTotalStake()).to.equal(initialStake.toString());
              //console.log("*before112");
              //snapshotId_ = await makeSnapshot(web3);
              await stake(staker, {value:newStake});
            });
            //after(async function() {
            //  await restoreSnapshot(web3,snapshotId_);
            //});
            it('getTotalStake equals sum of two stakes', async function() {
              expect(await getTotalStake()).to.equal(newStake.add(initialStake).toString());
            });
            it('viewStake equals sum of two stakes', async function() {
              expect(await viewStake(staker)).to.equal(newStake.add(initialStake).toString());
            });
            it('pool balance equals sum of two stakes plus pool stake', async function() {
              expect(await web3.eth.getBalance(poolContract.options.address)).to.equal(newStake.add(initialStake).add(apolloPoolNodeStake).toString());
            });
            it('getTokenPrice equals one', async function() {
              expect(await getTokenPrice()).to.equal(ONE.mul(FIXEDPOINT).toString());
            });
            it('tokens balance equals sum of two stakes', async function() {
              expect(await balanceOf(staker)).to.equal(newStake.add(initialStake).toString());
            });
            it('staked amount equals tokens balance times token price', async function() {
              const tokens = toBN(await balanceOf(staker));
              const tokenPrice = toBN(await getTokenPrice(staker));
              expect(await viewStake(staker)).to.equal(tokens.mul(tokenPrice).div(FIXEDPOINT).toString());
            });
            it('deactivation reverts when pool has user stakes ??', async function() {
              await assert.isReverted(poolContract.methods.deactivate().send({from:owner}));
            });
            it('reverts unstaking more tokens than sender has', async function() {
              const tokens = toBN(await balanceOf(staker));
              await assert.isReverted(unstake(tokens.add(ONE), staker));
            });
            it('successful unstaking all tokens', async function() {
              const {status} = await unstake(await balanceOf(staker), staker);
              expect(status).to.be.true;
            });
            checkUnstakingAllTokens(() => staker);
          //});
        }
        */

        describe('one staker', function() {
          it('stake1 unstake1', async function() {
            await checkTx(staker1, ZERO.sub(apolloPoolMinStake), apolloPoolMinStake, apolloPoolMinStake, 0,
              () => stake(staker1, {value:apolloPoolMinStake}));
            await checkTx(staker1, apolloPoolMinStake, ZERO.sub(apolloPoolMinStake), ZERO.sub(apolloPoolMinStake), 0,
              () => unstake(apolloPoolMinStake, staker1));
          });
          it('stake1 stake1 unstake1', async function() {
            await checkTx(staker1, ZERO.sub(apolloPoolMinStake), apolloPoolMinStake, apolloPoolMinStake, 0,
              () => stake(staker1, {value:apolloPoolMinStake}));
            await checkTx(staker1, ZERO.sub(apolloPoolNodeStake), apolloPoolNodeStake, apolloPoolNodeStake, 0,
              () => stake(staker1, {value:apolloPoolNodeStake}));
            await checkTx(staker1, apolloPoolMinStake.add(apolloPoolNodeStake), ZERO.sub(apolloPoolMinStake.add(apolloPoolNodeStake)), ZERO.sub(apolloPoolMinStake.add(apolloPoolNodeStake)), 0,
              () => unstake(apolloPoolMinStake.add(apolloPoolNodeStake), staker1));
          });
          it('stake1 unstake1-part unstake1', async function() {
            await checkTx(staker1, ZERO.sub(apolloPoolMinStake), apolloPoolMinStake, apolloPoolMinStake, 0,
              () => stake(staker1, {value:apolloPoolMinStake}));
            const halfStake = apolloPoolMinStake.div(toBN(2));
            await checkTx(staker1, halfStake, ZERO.sub(halfStake), ZERO.sub(halfStake), 0,
              () => unstake(halfStake, staker1));
            await checkTx(staker1, halfStake, ZERO.sub(halfStake), ZERO.sub(halfStake), 0,
              () => unstake(halfStake, staker1));
          });
          it('stake1 unstake1-part stake1 unstake1', async function() {
            await checkTx(staker1, ZERO.sub(apolloPoolMinStake), apolloPoolMinStake, apolloPoolMinStake, 0,
              () => stake(staker1, {value:apolloPoolMinStake}));
            const halfStake = apolloPoolMinStake.div(toBN(2));
            await checkTx(staker1, halfStake, ZERO.sub(halfStake), ZERO.sub(halfStake), 0,
              () => unstake(halfStake, staker1));
            await checkTx(staker1, ZERO.sub(apolloPoolMinStake), apolloPoolMinStake, apolloPoolMinStake, 0,
              () => stake(staker1, {value:apolloPoolMinStake}));
            await checkTx(staker1, halfStake.add(apolloPoolMinStake), ZERO.sub(halfStake.add(apolloPoolMinStake)), ZERO.sub(halfStake.add(apolloPoolMinStake)), 0,
              () => unstake(halfStake.add(apolloPoolMinStake), staker1));
          });
        });
        describe('two stakers', function() {
          it('stake1 stake2 unstake1 unstake2', async function() {
            await checkTx(staker1, ZERO.sub(apolloPoolMinStake), apolloPoolMinStake, apolloPoolMinStake, 0,
              () => stake(staker1, {value:apolloPoolMinStake}));
            await checkTx(staker2, ZERO.sub(apolloPoolNodeStake), apolloPoolNodeStake, apolloPoolNodeStake, 0,
              () => stake(staker2, {value:apolloPoolNodeStake}));
            await checkTx(staker1, apolloPoolMinStake, ZERO.sub(apolloPoolMinStake), ZERO.sub(apolloPoolMinStake), 0,
              () => unstake(apolloPoolMinStake, staker1));
            await checkTx(staker2, apolloPoolNodeStake, ZERO.sub(apolloPoolNodeStake), ZERO.sub(apolloPoolNodeStake), 0,
              () => unstake(apolloPoolNodeStake, staker2));
          });
          it('stake1 transfer(from 1 to 2) unstake2', async function() {
            await checkTx(staker1, ZERO.sub(apolloPoolMinStake), apolloPoolMinStake, apolloPoolMinStake, 0,
              () => stake(staker1, {value:apolloPoolMinStake}));
            await transfer(staker2, apolloPoolMinStake, staker1);
            expect(await viewStake(staker1)).to.equal('0');
            expect(await viewStake(staker2)).to.equal(apolloPoolMinStake.toString());
            await checkTx(staker2, apolloPoolMinStake, ZERO.sub(apolloPoolMinStake), ZERO.sub(apolloPoolMinStake), 0,
              () => unstake(apolloPoolMinStake, staker2));
          });
        });

        // todo: 0 nodes
        // todo: addReward sent not from a node

        function calcPoolReward(reward, totalStake) {
          const ownerStake = apolloPoolNodeStake.sub(totalStake.mod(apolloPoolNodeStake));
          let poolReward = ownerStake == apolloPoolNodeStake ? 0 : reward.sub(reward.mul(ownerStake).div(apolloPoolNodeStake));
          if (poolReward.gt(ZERO) && poolFee.gt(ZERO)) {
            poolReward = poolReward.sub(poolReward.mul(poolFee).div(MILLION));
            // poolReward*(MILLION-poolFee)/MILLION
          }
          // poolReward = totalStake*(MILLION-poolFee)/MILLION*(1 - (ownerStake/apolloPoolNodeStake))
          // 
          return poolReward;
        }

        describe('reward', function() {
          it('reward deactivate(retire)', async function() {
            const reward = ONE.mul(FIXEDPOINT);
            const ownerBalanceBefore = toBN(await web3.eth.getBalance(owner));
            await checkTx(node1, ZERO.sub(reward), 0, 0, 0,
              () => addReward(node1, {value:reward}));
            expect(ownerBalanceBefore.add(reward).toString()).to.equal(await web3.eth.getBalance(owner));
            const poolBalance = toBN(await web3.eth.getBalance(poolContract.options.address));
            await checkTx(owner, apolloPoolNodeStake.add(poolBalance), 0, ZERO.sub(poolBalance), 0,
              () => deactivate());
          });
          it('stake1 reward unstake1 deactivate(retire)', async function() {
            const stakedAmount = apolloPoolMinStake;
            const receivedTokens = stakedAmount;
            await checkTx(staker1, ZERO.sub(stakedAmount), receivedTokens, stakedAmount, 0,
              () => stake(staker1, {value:stakedAmount}));
            const totalStake = stakedAmount;
            const reward = apolloPoolMinStake;
            const poolReward = calcPoolReward(reward, totalStake);
            const priceChange = poolReward.mul(FIXEDPOINT).div(totalStake);
            const ownerBalanceBefore = toBN(await web3.eth.getBalance(owner));
            await checkTx(node1, ZERO.sub(reward), 0, poolReward, priceChange,
              () => addReward(node1, {value:reward}));
            expect(ownerBalanceBefore.add(reward.sub(poolReward)).toString()).to.equal(await web3.eth.getBalance(owner));

            // isReverted deactivate
            
            const price = toBN(await getTokenPrice());
            const ambStake = stakedAmount.mul(price).div(FIXEDPOINT);
            await checkTx(staker1, ambStake, ZERO.sub(apolloPoolMinStake), ZERO.sub(ambStake), ONE.mul(FIXEDPOINT).sub(price),
              () => unstake(receivedTokens, staker1));
            const poolBalance = toBN(await web3.eth.getBalance(poolContract.options.address));
            await checkTx(owner, apolloPoolNodeStake.add(poolBalance), 0, ZERO.sub(poolBalance), 0,
              () => deactivate());
              
          });
        });
        describe('onboard / retire', function() {
          it('stake1 onboard unstake1(retire) deactivate(retire)', async function() {
            await checkTx(staker1, ZERO.sub(apolloPoolNodeStake), apolloPoolNodeStake, apolloPoolNodeStake, 0,
              () => stake(staker1, {value:apolloPoolNodeStake}));
            await addNode(node2, service);
            expect(await getNodesCount()).to.equal('2');
            await checkTx(staker1, apolloPoolNodeStake, ZERO.sub(apolloPoolNodeStake), 0, 0,
              () => unstake(apolloPoolNodeStake, staker1));
            expect(await getNodesCount()).to.equal('1');
            const poolBalance = toBN(await web3.eth.getBalance(poolContract.options.address));
            await checkTx(owner, apolloPoolNodeStake.add(poolBalance), 0, ZERO.sub(poolBalance), 0,
              () => deactivate());
          });
          it('stake1 stake2 reward onboard unstake1 unstake2(retire) deactivate(retire)', async function() {
            await stake(staker1, {value:apolloPoolMinStake});
            await stake(staker2, {value:apolloPoolNodeStake.div(toBN(2))});
            const totalStake = toBN(await getTotalStake());

            // calculate reward size that poolReward equals apolloPoolNodeStake
            const reward = apolloPoolNodeStake.mul(MILLION).div(calcPoolReward(MILLION, totalStake));
            const poolReward = calcPoolReward(reward, totalStake);
            expect(poolReward.toString()).to.equal(apolloPoolNodeStake.toString());
            const priceChange = poolReward.mul(FIXEDPOINT).div(totalStake);

            const ownerBalanceBefore = toBN(await web3.eth.getBalance(owner));
            await checkTx(node1, ZERO.sub(reward), 0, poolReward, priceChange,
              () => addReward(node1, {value:reward}));
            
            expect(ownerBalanceBefore.add(reward.sub(poolReward)).toString()).to.equal(await web3.eth.getBalance(owner));

            await addNode(node2, service);
            expect(await getNodesCount()).to.equal('2');

            await unstake(await viewStake(staker1), staker1);
            expect(await getNodesCount()).to.equal('2');
            await unstake(await viewStake(staker2), staker2);
            expect(await getNodesCount()).to.equal('1');
            
            const poolBalance = toBN(await web3.eth.getBalance(poolContract.options.address));
            await checkTx(owner, apolloPoolNodeStake.add(poolBalance), 0, ZERO.sub(poolBalance), 0,
              () => deactivate());
            
          });
        });
      });

          /*
          describe('staked minimum amount', function() {
            let snapshotId_;
            before(async function() {
              //console.log("*before11");
              snapshotId_ = await makeSnapshot(web3);

              console.log('ownerStake:', await poolContract.methods.ownerStake().call());
              await stake(staker1, {value:apolloPoolMinStake});
              console.log('ownerStake:', await poolContract.methods.ownerStake().call());
              console.log('viewStake:', await viewStake(staker1));
              console.log('getTotalStake:', await getTotalStake(staker1));
            });
            after(async function() {
              await restoreSnapshot(web3,snapshotId_);
            });
            it('getTotalStake equals staked amount', async function() {
              expect(await getTotalStake()).to.equal(apolloPoolMinStake.toString());
            });
            it('viewStake equals staked amount', async function() {
              expect(await viewStake(staker1)).to.equal(apolloPoolMinStake.toString());
            });
            it('pool balance equals staked amount plus pool stake', async function() {
              expect(await web3.eth.getBalance(poolContract.options.address)).to.equal(apolloPoolMinStake.add(apolloPoolNodeStake).toString());
            });
            it('getTokenPrice equals one', async function() {
              expect(await getTokenPrice()).to.equal(ONE.mul(FIXEDPOINT).toString());
            });
            it('tokens balance equals staked amount', async function() {
              expect(await balanceOf(staker1)).to.equal(apolloPoolMinStake.toString());
            });
            it('staked amount equals tokens balance times token price', async function() {
              const tokens = toBN(await balanceOf(staker1));
              const tokenPrice = toBN(await getTokenPrice(staker1));
              expect(await viewStake(staker1)).to.equal(tokens.mul(tokenPrice).div(FIXEDPOINT).toString());
            });
            it('deactivation reverts when pool has user stakes ??', async function() {
              await assert.isReverted(poolContract.methods.deactivate().send({from:owner}));
            });
            it('reverts unstaking more tokens than sender has', async function() {
              const tokens = toBN(await balanceOf(staker1));
              await assert.isReverted(unstake(tokens.add(ONE), staker1));
            });
            it('successful unstaking all tokens', async function() {
              const {status} = await unstake(await balanceOf(staker1), staker1);
              expect(status).to.be.true;
            });
            it('reward', async function() {
              //const {status} = await unstake(await balanceOf(staker1), staker1);
              //expect(status).to.be.true;
              await poolsNodesManager.methods.addPool(poolContract.options.address).send({from: owner});
              await addNode(node1, service);
              console.log('ownerStake:', await poolContract.methods.ownerStake().call());
              await addReward(node1, {value:apolloPoolMinStake});
              const viewStake_ = toBN(await viewStake(staker1));
              const getTotalStake_ = toBN(await getTotalStake(staker1));
              const getTokenPrice_ = toBN(await getTokenPrice(staker1));
              console.log('viewStake:', viewStake_.toString());
              console.log('getTotalStake:', getTotalStake_.toString());
              console.log('getTokenPrice:', getTokenPrice_.toString());
              console.log('***:', viewStake_.mul(getTokenPrice_).div(FIXEDPOINT).toString());
            });

            checkUnstakingAllTokens(() => staker1);
            describe('staked node stake amount', function() {
              checkStake(() => [staker1, apolloPoolMinStake, apolloPoolNodeStake,'']);
            });
          });
          */
    });
  });
});
