/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createWeb3, deployContract} from '../../../src/utils/web3_tools';
import chaiEmitEvents from '../../helpers/chaiEmitEvents';
import BlockRewardsJson from '../../../build/contracts/BlockRewards.json';

const {expect} = chai;
chai.use(chaiAsPromised);
chai.use(chaiEmitEvents);

describe('Block rewards contract', () => {
  const standardOptions = {
    gas: 1000000
  };

  const deploy = async (web3, sender, superUser) => deployContract(web3, BlockRewardsJson, [sender, superUser], {from: sender});
  const getOwner = async (contract) => contract.methods.owner().call();
  const transferOwnership = async (contract, sender, newOwner) => contract.methods.transferOwnership(newOwner).send({...standardOptions, from: sender});
  const reward = async (contract, sender, benefactors, kind) => contract.methods.reward(benefactors, kind).call({from: sender});

  let web3;
  let owner;
  let otherUser;
  let superUser;
  let newOwner;
  let exampleBenefactors;

  before(async () => {
    web3 = await createWeb3();
    [owner, otherUser, superUser, newOwner] = await web3.eth.getAccounts();
    exampleBenefactors = Array(3)
      .fill(null)
      .map(() => web3.eth.accounts.create().address);
  });

  describe('constructor', () => {
    let contract;

    before(async () => {
      contract = await deploy(web3, owner, superUser);
    });

    it('sets the owner', async () => {
      const storedOwner = await getOwner(contract);
      expect(storedOwner).to.equal(owner);
    });
  });

  describe('transferring ownership', () => {
    let contract;

    beforeEach(async () => {
      contract = await deploy(web3, owner, superUser);
    });

    it('sets the new owner', async () => {
      await expect(transferOwnership(contract, owner, newOwner)).to.be.fulfilled;
      expect(await getOwner(contract)).to.equal(newOwner);
    });

    it('emits a OwnershipTransferred event', async () => {
      expect(await transferOwnership(contract, owner, newOwner)).to.emitEvent('OwnershipTransferred');
    });

    it(`to 0x0 address is not allowed`, async () => {
      await expect(transferOwnership(contract, owner, '0x0')).to.be.rejected;
    });

    it(`can't be invoked by non-owner`, async () => {
      await expect(transferOwnership(contract, otherUser, newOwner)).to.be.rejected;
    });
  });

  describe('reward', () => {
    let contract;
    let kinds;
    let oneEther;

    beforeEach(async () => {
      contract = await deploy(web3, owner, superUser);
      kinds = Array(exampleBenefactors.length).fill(0);
      oneEther = web3.utils.toWei('1', 'ether');
    });

    it('assigns a reward of 1 ether to every address provided in the parameters', async () => {
      const rewards = await reward(contract, superUser, exampleBenefactors, kinds);
      const {0 : rewardedAddresses, 1 : rewardedValues} = rewards;
      expect(rewardedAddresses).to.have.members(exampleBenefactors);
      expect(rewardedValues).to.deep.equal(Array(exampleBenefactors.length).fill(oneEther));
    });

    it('fails if a different number of benefactors and reward kinds is provided', async () => {
      await expect(reward(contract, superUser, exampleBenefactors, kinds.slice(1))).to.be.rejected;
    });

    it('fails for non-SUPER_USER', async () => {
      await expect(reward(contract, owner, exampleBenefactors, kinds)).to.be.rejected;
    });
  });
});
