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
import PoolTest from '../../../src/contracts/PoolTest.json';
import PoolToken from '../../../src/contracts/PoolToken.json';
import Pool from '../../../src/contracts/Pool.json';
import {ROLE_CODES, ZERO_ADDRESS, APOLLO_DEPOSIT} from '../../../src/constants';
import {utils} from 'web3';

const {toBN} = utils;

async function printReason(promise) {
  try {
    await promise;
  } catch(err) {console.log(err.message.split('\n')[0], err.reason)}
}

describe('Pool Contract', () => {
  let web3;
  let owner;
  let initialApollo;
  let addr1;
  let addr2;
  let addr3;
  let addr4;

  //let node;
  //let manager;
  //let pool;

  let snapshotId;

  //let poolApollo;
  //let poolAtlas;
  let poolsNodesManager;
  let poolsNodesStorage;
  //let poolTest;
  let poolToken;
  //let context;

  //let poolFee = 0;

  const apolloPoolNodeStake = toBN(APOLLO_DEPOSIT);
  const apolloPoolMinStake = toBN(Math.floor(APOLLO_DEPOSIT/1000));

  //const activate = (senderAddress = owner, options = {}) => poolApollo.methods.activate().send({from: senderAddress, ...options});
  //const deactivate = (senderAddress = owner, options = {}) => poolApollo.methods.deactivate().send({from: senderAddress, ...options});

  //const addPool = (pool, senderAddress = owner) => poolsNodesManager.methods.addPool(pool).send({from: senderAddress});

  //const addToWhitelist = (addrs, senderAddress = owner) => context.methods.addToWhitelist(addrs).send({from: senderAddress});
  
  //const addNode = (node, pool, nodeType, senderAddress = owner) => poolsNodesStorage.methods.addNode(node, pool, nodeType).send({from: senderAddress});

  //const balanceOf = (_who, senderAddress = owner) => poolToken.methods.balanceOf(_who).call({from: senderAddress});
  
  
  before(async () => {
    web3 = await createWeb3();
    web3.eth.handleRevert = true;
    [owner, initialApollo, addr1, addr2, addr3, addr4] = await web3.eth.getAccounts();

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

    //poolTest = await deployContract(web3, PoolTest);

    //poolApollo = await deployContract(web3, Pool, [ROLE_CODES.APOLLO, apolloNodeStake, apolloMinStake, poolFee, poolsNodesManager.options.address]);
    //poolAtlas  = await deployContract(web3, Pool, [ROLE_CODES.ATLAS,  apolloNodeStake, apolloMinStake, poolFee, poolsNodesManager.options.address]);

    //await addToWhitelist([poolTest.options.address]);
    // await addToWhitelist([poolContr.options.address]);

    //manager = poolsNodesManager.options.address;
    //pool = poolApollo.options.address;

  
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  // todo: check events !!!

  describe('Apollo pool with zero fee', async () => {
    let poolFee;
    before(async () => {
      poolFee = 0;
    });
    describe('deploy', async () => {
      it('success', async () => {
        const poolContract = await deployContract(web3, Pool, [ROLE_CODES.APOLLO, apolloPoolNodeStake, apolloPoolMinStake, poolFee, poolsNodesManager.options.address]);
        expect(poolContract).to.be.instanceof(web3.eth.Contract);

        // todo: check public vars initial state?
      });

      it('is payable', async () => {
        const poolContract = await deployContract(web3, Pool, [ROLE_CODES.APOLLO, apolloPoolNodeStake, apolloPoolMinStake, poolFee, poolsNodesManager.options.address]);
        const {status} = await web3.eth.sendTransaction({from:owner, to:poolContract.options.address, value:'1', gasPrice:'1', gas:'1000000'});
        expect(status).to.be.true;
      })

      it('reverts when minimum stake value is zero', async () => {
        try {
          await deployContract(web3, Pool, [ROLE_CODES.APOLLO, apolloPoolNodeStake, 0, poolFee, poolsNodesManager.options.address]);
          throw new Error('deploy successful');
        } catch (err) {
          if (!err.message.match(/revert/)) throw err;
        }
      });

      it('reverts when manager address is zero', async () => {
        try {
          await deployContract(web3, Pool, [ROLE_CODES.APOLLO, apolloPoolNodeStake, apolloPoolMinStake, poolFee, ZERO_ADDRESS]);
          throw new Error('deploy successful');
        } catch (err) {
          if (!err.message.match(/revert/)) throw err;
        }
      });
    });

    describe('when pool deployed', async () => {
      let poolContract;

      before(async () => {
        poolContract = await deployContract(web3, Pool, [ROLE_CODES.APOLLO, apolloPoolNodeStake, apolloPoolMinStake, poolFee, poolsNodesManager.options.address]);
      });

      describe('when pool not added to manager', async () => {
        it('activation reverts', async () => {
          await assert.isReverted(poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake}));
        });
      });

      describe('when pool added to manager', async () => {
        before(async () => {
          await poolsNodesManager.methods.addPool(poolContract.options.address).send({from:owner});
        });

        describe('when pool not activated', async () => {
          describe('activation', async () => {
            it('success', async () => {
              const {status} = await poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake});
              expect(status).to.be.true;
            });
      
            it('owner stake locked', async () => {
              const gasPrice = toBN('1');
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
      
            it('first node onboarded', async () => {
              await poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake});
              const {stake} = await poolContract.methods.nodes(0).call({from:owner});
              expect(stake).to.equal(apolloPoolNodeStake.toString());
            });
      
            it('only one node onboarded', async () => {
              await poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake});
              try {
                await poolContract.methods.nodes(1).call({from:owner});
                throw new Error('second node available');
              } catch (err) {
                if (!err.message.match(/Out of Gas/)) throw err;
              }
            });
      
            it('reverts when sender not an owner', async () => {
              await assert.isReverted(poolContract.methods.activate().send({from:addr1, value:apolloPoolNodeStake}));
            });
      
            it('reverts when sent value not equals node stake value', async () => {
              await assert.isReverted(poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake.add(toBN('1'))}));
            });
          });

          it('deactivation reverts', async () => {
            await assert.isReverted(poolContract.methods.deactivate().send({from:owner}));
          });

          it('stake reverts', async () => {
            await assert.isReverted(poolContract.methods.stake().send({from:owner, value:apolloPoolMinStake}));
          });
        });
  
        describe('when pool activated', async () => {
          before(async () => {
            await poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake});
          });
  
          describe('deactivation', async () => {  
            it('success', async () => {
              const {status} = await poolContract.methods.deactivate().send({from:owner});
              expect(status).to.be.true;
            });
      
            it('owner stake returned', async () => {
              const gasPrice = toBN('1');
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
      
            it('reverts when sender not an owner', async () => {
              await assert.isReverted(poolContract.methods.deactivate().send({from:addr1}));
            });
          });

          it('activation reverts', async () => {
            await assert.isReverted(poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake}));
          });

          // todo: check deactivation after stakes and rewards with pool fee > 0
        });
      });
    });

    describe('staking tests', async () => {
      describe('pool activated', async () => {
        let poolContract;

        let staker;

        let stake;
        let unstake;
        let viewStake;
        let balanceOf;
        let getTotalStake;
        let getTokenPrice;
  
        before(async () => {
          poolContract = await deployContract(web3, Pool, [ROLE_CODES.APOLLO, apolloPoolNodeStake, apolloPoolMinStake, poolFee, poolsNodesManager.options.address]);
          await poolsNodesManager.methods.addPool(poolContract.options.address).send({from:owner});
          await poolContract.methods.activate().send({from:owner, value:apolloPoolNodeStake});
  
          stake = (senderAddress = owner, options = {}) => poolContract.methods.stake().send({from: senderAddress, ...options});
          unstake = (tokens, senderAddress = owner) => poolContract.methods.unstake(tokens).send({from: senderAddress});
          viewStake = (senderAddress = owner) => poolContract.methods.viewStake().call({from: senderAddress});

          getTotalStake = (senderAddress = owner) => poolContract.methods.getTotalStake().call({from: senderAddress});
          getTokenPrice = (senderAddress = owner) => poolContract.methods.getTokenPrice().call({from: senderAddress});

          const poolTokenAddr = await poolContract.methods.token().call({from:owner});
          poolToken = new web3.eth.Contract(PoolToken.abi, poolTokenAddr);
          balanceOf = (_who, senderAddress = owner) => poolToken.methods.balanceOf(_who).call({from: senderAddress});
        
          staker = addr1;
        });

        it('revets staking less than minimum amount', async () => {
          await assert.isReverted(stake(addr1, {value:apolloPoolMinStake.sub(toBN(1))}));
        });

        //describe('staking minimum amount', async () => {
          it('successful staking minimum amount', async () => {
            const {status} = await stake(addr1, {value:apolloPoolMinStake});
            expect(status).to.be.true;
          });

          describe('staked minimum amount', async () => {
            before(async () => {
              await stake(staker, {value:apolloPoolMinStake});
            });
            it('getTotalStake equals staked amount', async () => {
              expect(await getTotalStake()).to.equal(apolloPoolMinStake.toString());
            });
            it('viewStake equals staked amount', async () => {
              expect(await viewStake(staker)).to.equal(apolloPoolMinStake.toString());
            });
            /*
            it('tokens balance staked amount', async () => {
              expect(await balanceOf(staker)).to.equal(apolloMinStake.toString());
            });
            it('getTokenPrice equals one', async () => {
              expect(await getTokenPrice()).to.equal('1');
            });
            */
            it('returned tokens count times token price equals staked amount', async () => {
              const stake = toBN(await viewStake(staker));
              const tokens = toBN(await balanceOf(staker));
              const tokenPrice = toBN(await getTokenPrice(staker));
              // console.log(tokens.toString(),tokenPrice.toString(),stake.toString());
              expect(tokens.mul(tokenPrice).toString()).to.equal(stake.toString());
            });
            it('successful unstaking all tokens', async () => {
              const tokens = toBN(await balanceOf(staker));
              const {status} = await unstake(tokens, addr1);
              expect(status).to.be.true;
            });
            describe('unstaked all tokens', async () => {
              before(async () => {
                await unstake(await balanceOf(staker), addr1);
              });
              it('getTotalStake equals zero', async () => {
                expect(await getTotalStake()).to.equal('0');
              });
              it('viewStake equals zero', async () => {
                const stake = toBN(await viewStake(staker));
                expect(stake.toString()).to.equal('0');
              });
              it('tokens balance equals zero', async () => {
                const tokens = toBN(await balanceOf(staker));
                expect(tokens.toString()).to.equal('0');
              });
              /*
              it('getTokenPrice equals one', async () => {
                const tokenPrice = toBN(await getTokenPrice(staker));
                expect(tokenPrice.toString()).to.equal('1');
              });
              */
            });
          });
        //});
      });

/*
      it('stake 1', async () => {

        return;

        //await addPool(poolApollo.options.address);

        try {
          await activate(owner, {value:APOLLO_DEPOSIT});
        } catch(err) {console.log(err.message.split('\n')[0], err.reason)}

        await assert.isReverted(stake(addr1, {value:apolloMinStake.sub(toBN(1))})); // Pool: stake value tool low
        try {

          console.log(addr1);
          console.log('stake:', apolloMinStake.toString());
          await stake(addr1, {value:apolloMinStake});
          let stake1 = await viewStake(addr1);
          console.log('viewStake:', stake1);
          console.log('getTokenPrice:', await getTokenPrice());
          console.log('getTotalStake:', await getTotalStake());
          console.log('balance:', await web3.eth.getBalance(pool));
          console.log('---');
          console.log(addr2);
          console.log('stake:', apolloMinStake.mul(toBN(10)).toString());
          await stake(addr2, {value:apolloMinStake.mul(toBN(10))});
          let stake2 = await viewStake(addr2);
          console.log('viewStake:', stake2);
          console.log('getTokenPrice:', await getTokenPrice());
          console.log('getTotalStake:', await getTotalStake());
          console.log('balance:', await web3.eth.getBalance(pool));
          console.log('---');
          console.log(addr3);
          console.log('stake:', apolloNodeStake.sub(apolloMinStake).toString());
          await stake(addr3, {value:apolloNodeStake.sub(apolloMinStake)});
          let stake3 = await viewStake(addr3);
          console.log('viewStake:', stake3);
          console.log('getTokenPrice:', await getTokenPrice());
          console.log('getTotalStake:', await getTotalStake());
          console.log('balance:', await web3.eth.getBalance(pool));
          console.log('---');
          console.log(addr1);
          console.log('unstake:', stake1);
          await unstake(stake1, addr1);
          stake1 = await viewStake(addr1);
          console.log('viewStake:', stake1);
          console.log('getTokenPrice:', await getTokenPrice());
          console.log('getTotalStake:', await getTotalStake());
          console.log('balance:', await web3.eth.getBalance(pool));
          console.log('---');
          console.log(addr2);
          console.log('unstake:', stake2);
          await unstake(stake2, addr2);
          stake2 = await viewStake(addr2);
          console.log('viewStake:', stake2);
          console.log('getTokenPrice:', await getTokenPrice());
          console.log('getTotalStake:', await getTotalStake());
          console.log('balance:', await web3.eth.getBalance(pool));
          console.log('---');
          const gasPrice = toBN('1');
          const reward = toBN('1');
          await web3.eth.sendTransaction({from:addr4, to:pool, value:reward, gasPrice});
          console.log('getTokenPrice:', await getTokenPrice());
          console.log('getTotalStake:', await getTotalStake());
          console.log('balance:', await web3.eth.getBalance(pool));
          console.log('viewStake1:', await viewStake(addr1));
          console.log('viewStake2:', await viewStake(addr2));
          console.log('viewStake3:', await viewStake(addr3));
          console.log('---');
          
        } catch(err) {console.log(err.message.split('\n')[0], err.reason)}
        
        // todo split test

        //await poolsNodesManager.methods.addPool(pool.options.address).send({from});

        // todo doesn't work
        //await pool.methods.stake().send({value: 10000000000000, from}); // 1 token for this price
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

      it('stake 2', async () => {
        return;
        try {
          await addPool(poolApollo.options.address);

          await addNode(node, ZERO_ADDRESS, ROLE_CODES.APOLLO);

          await activate(owner, {value:APOLLO_DEPOSIT});

          const gasPrice = toBN('1');
          let reward = toBN('11111111111111111');
          await web3.eth.sendTransaction({from:addr4, to:node, value:reward, gasPrice});

          console.log('getTokenPrice:', await getTokenPrice());
          console.log('getTotalStake:', await getTotalStake());
          console.log('getTotalStake:', await getTotalStake());
          console.log('balance-p:', await web3.eth.getBalance(pool));
          console.log('balance-n:', await web3.eth.getBalance(node));
          console.log('---');

          console.log(addr1);
          console.log('stake:', apolloMinStake.toString());
          await stake(addr1, {value:apolloMinStake});
          let stake1 = await viewStake(addr1);
          console.log('viewStake:', stake1);
          console.log('getTokenPrice:', await getTokenPrice());
          console.log('getTotalStake:', await getTotalStake());
          console.log('getTotalStake:', await getTotalStake());
          console.log('balance-p:', await web3.eth.getBalance(pool));
          console.log('balance-n:', await web3.eth.getBalance(node));
          console.log('---');
          console.log(addr2);
          console.log('stake:', apolloMinStake.mul(toBN(10)).toString());
          await stake(addr2, {value:apolloMinStake.mul(toBN(10))});
          let stake2 = await viewStake(addr2);
          console.log('viewStake:', stake2);
          console.log('getTokenPrice:', await getTokenPrice());
          console.log('getTotalStake:', await getTotalStake());
          console.log('getTotalStake:', await getTotalStake());
          console.log('balance-p:', await web3.eth.getBalance(pool));
          console.log('balance-n:', await web3.eth.getBalance(node));
          console.log('---');
          console.log(addr3);
          console.log('stake:', apolloNodeStake.sub(apolloMinStake).toString());
          await stake(addr3, {value:apolloNodeStake.sub(apolloMinStake)});
          let stake3 = await viewStake(addr3);
          console.log('viewStake:', stake3);
          console.log('getTokenPrice:', await getTokenPrice());
          console.log('getTotalStake:', await getTotalStake());
          console.log('getTotalStake:', await getTotalStake());
          console.log('balance-p:', await web3.eth.getBalance(pool));
          console.log('balance-n:', await web3.eth.getBalance(node));
          console.log('---');

          console.log(addr1);
          console.log('unstake:', stake1);
          await unstake(stake1, addr1);
          stake1 = await viewStake(addr1);
          console.log('viewStake:', stake1);
          console.log('getTokenPrice:', await getTokenPrice());
          console.log('getTotalStake:', await getTotalStake());
          console.log('getTotalStake:', await getTotalStake());
          console.log('balance-p:', await web3.eth.getBalance(pool));
          console.log('balance-n:', await web3.eth.getBalance(node));
          console.log('---');
          console.log(addr2);
          console.log('unstake:', stake2);
          await unstake(stake2, addr2);
          stake2 = await viewStake(addr2);
          console.log('viewStake:', stake2);
          console.log('getTokenPrice:', await getTokenPrice());
          console.log('getTotalStake:', await getTotalStake());
          console.log('getTotalStake:', await getTotalStake());
          console.log('balance-p:', await web3.eth.getBalance(pool));
          console.log('balance-n:', await web3.eth.getBalance(node));
          console.log('---');


        } catch(err) {console.log(err.message.split('\n')[0], err.reason)}
      });
*/
    });
  });
});
