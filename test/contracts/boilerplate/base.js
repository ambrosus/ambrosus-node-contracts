/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3, deployContract} from '../../../src/utils/web3_tools';
import chaiEmitEvents from '../../helpers/chaiEmitEvents';
import observeBalanceChange from '../../helpers/web3BalanceObserver';

import CallerContractJson from '../../../src/contracts/CallerContract.json';
import CalledContractJson from '../../../src/contracts/CalledContract.json';
import HeadJson from '../../../src/contracts/Head.json';
import ContextJson from '../../../src/contracts/Context.json';

chai.use(chaiEmitEvents);

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Base Contract', () => {
  let web3;
  let head;
  let callerContract;
  let calledContract;
  let context;
  let deployer;
  let catalogue;
  let storageCatalogue;
  let fundsMigrationTarget;
  let migrator;


  before(async () => {
    web3 = await createWeb3();
    [deployer, catalogue, storageCatalogue, migrator, fundsMigrationTarget] = await web3.eth.getAccounts();

    head = await deployContract(web3, HeadJson, [deployer], {from: deployer});
    calledContract = await deployContract(web3, CalledContractJson, [head.options.address], {from: deployer});
    callerContract = await deployContract(web3, CallerContractJson, [head.options.address, calledContract.options.address], {from: deployer});
  });

  const deployContext = async (web3, sender, head, injected) => {
    context = await deployContract(web3, ContextJson, [injected, catalogue, storageCatalogue, 12], {from: sender});
    await head.methods.setContext(context.options.address).send({from: sender});
    return context;
  };

  it('onlyContextInternalCalls decorated methods can be called by contracts that are part of the context', async () => {
    await deployContext(web3, deployer, head, [callerContract.options.address, calledContract.options.address]);
    await expect(callerContract.methods.callOtherContract().call()).to.be.eventually.fulfilled;
  });

  it('onlyContextInternalCalls decorated methods can not be called by contracts that are not part of the context', async () => {
    await deployContext(web3, deployer, head, [calledContract.options.address]);
    await expect(callerContract.methods.callOtherContract().call()).to.be.eventually.rejected;
  });

  describe('constructor - fail saves', async () => {
    // NOTE: web3 incorrectly reports a failed deployment as successful, as a workaround we try to call a different method which should then fail.
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    it('throws if owner is zero', async () => {
      const head2 = await deployContract(web3, HeadJson, [zeroAddress], {from: deployer});
      await expect(head2.methods.context().call()).to.be.eventually.rejected;
    });
  });

  describe('funds migration', async () => {
    const storedValue = '100';
    const allocateFunds = async (from, to, value) => web3.eth.sendTransaction({from, to, value, gas: 1000000});
    const fundsMigration =  async (sender, to) => calledContract.methods.migrateFunds(to).send({from: sender});

    it('if all requirements are met, funds are moved correctly', async () => {
      await deployContext(web3, deployer, head, [migrator, fundsMigrationTarget]);
      await allocateFunds(deployer, calledContract.options.address, storedValue);

      const balanceChange = await observeBalanceChange(web3, fundsMigrationTarget, async () => fundsMigration(migrator, fundsMigrationTarget));

      expect(balanceChange.toString()).to.equal(storedValue);
      expect(await web3.eth.getBalance(calledContract.options.address)).to.equal('0');
    });

    it('called contract can not be context internal', async () => {
      await deployContext(web3, deployer, head, [calledContract.options.address, migrator, fundsMigrationTarget]);
      await allocateFunds(deployer, calledContract.options.address, storedValue);

      await expect(fundsMigration(migrator, fundsMigrationTarget)).to.be.eventually.rejected;
    });

    it('targeted address must be context internal', async () => {
      await deployContext(web3, deployer, head, [migrator]);
      await allocateFunds(deployer, calledContract.options.address, storedValue);

      await expect(fundsMigration(migrator, fundsMigrationTarget)).to.be.eventually.rejected;
    });
  });
});
