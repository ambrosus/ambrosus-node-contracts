/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3, deployContract} from '../../../src/web3_tools';
import HeadJson from '../../../build/contracts/Head.json';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Head Contract', () => {
  let web3;
  let deployAddress;
  let ownerAddress;
  let nonOwnerAddress;
  let otherAddress;

  const standardOptions = {
    gas: 1000000
  };

  const deploy = async (web3, sender, owner) => deployContract(web3, HeadJson, [owner], {from: sender});
  const getOwner = async (contract, sender) => contract.methods.owner().call({from: sender});
  const getContext = async (contract, sender) => contract.methods.context().call({from: sender});
  const setContext = async (contract, sender, newContext) => contract.methods.setContext(newContext).send({...standardOptions, from: sender});
  const transferOwnership = async (contract, sender, newOwner) => contract.methods.transferOwnership(newOwner).send({...standardOptions, from: sender});

  before(async () => {
    web3 = await createWeb3();
    [deployAddress, ownerAddress, nonOwnerAddress, otherAddress] = await web3.eth.getAccounts();
  });

  describe('constructor', () => {
    let contract;

    before(async () => {
      contract = await deploy(web3, deployAddress, ownerAddress);
    });

    it('sets the owner', async () => {
      expect(await getOwner(contract, ownerAddress)).to.equal(ownerAddress);
    });

    it('sets the context to null', async () => {
      const storedContext = await getContext(contract, ownerAddress);
      expect(storedContext).to.equal(`0x0000000000000000000000000000000000000000`);
    });
  });

  describe('setting context', () => {
    let contract;

    before(async () => {
      contract = await deploy(web3, deployAddress, ownerAddress);
    });

    it('can be done by owner', async () => {
      await setContext(contract, ownerAddress, otherAddress);
      expect(await getContext(contract, ownerAddress)).to.equal(otherAddress);
    });

    it('can not be done by non owner', async () => {
      await expect(setContext(contract, nonOwnerAddress, otherAddress)).to.be.rejected;
    });
  });

  describe('transferring ownership', () => {
    let contract;

    beforeEach(async () => {
      contract = await deploy(web3, deployAddress, ownerAddress);
    });

    it('sets the new owner', async () => {
      await expect(transferOwnership(contract, ownerAddress, otherAddress)).to.be.fulfilled;
      expect(await getOwner(contract, ownerAddress)).to.equal(otherAddress);
    });

    it('emits a OwnershipTransferred event', async () => {
      expect(await transferOwnership(contract, ownerAddress, otherAddress)).to.emitEvent('OwnershipTransferred');
    });

    it(`can't be invoked by non-owner`, async () => {
      await expect(transferOwnership(contract, nonOwnerAddress, otherAddress)).to.be.rejected;
    });
  });
});
