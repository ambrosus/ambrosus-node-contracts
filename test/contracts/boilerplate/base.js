/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3, deployContract} from '../../../src/utils/web3_tools';
import chaiEmitEvents from '../../helpers/chaiEmitEvents';

import CallerContractJson from '../../../build/contracts/CallerContract.json';
import CalledContractJson from '../../../build/contracts/CalledContract.json';
import HeadJson from '../../../build/contracts/Head.json';
import ContextJson from '../../../build/contracts/Context.json';

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

  before(async () => {
    web3 = await createWeb3();
    [deployer] = await web3.eth.getAccounts();

    head = await deployContract(web3, HeadJson, [deployer], {from: deployer});
    calledContract = await deployContract(web3, CalledContractJson, [head.options.address], {from: deployer});
    callerContract = await deployContract(web3, CallerContractJson, [head.options.address, calledContract.options.address], {from: deployer});
  });

  const deployContext = async (web3, sender, head, injected) => {
    const constructorABI = ContextJson.abi.find((method) => method.type === 'constructor');
    const constructorArguments = [...new Array(constructorABI.inputs.length - injected.length).fill('0x0'), ...injected];
    context = await deployContract(web3, ContextJson, constructorArguments, {from: sender});
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
});
