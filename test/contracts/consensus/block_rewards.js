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

  const deploy = async (web3, sender, owner, superUser) => deployContract(web3, BlockRewardsJson, [owner, superUser], {from: sender});
  const getOwner = async (contract) => contract.methods.owner().call();
  const transferOwnership = async (contract, sender, newOwner) => contract.methods.transferOwnership(newOwner).send({...standardOptions, from: sender});
  const addBeneficiary = async (contract, sender, beneficiary, share) => contract.methods.addBeneficiary(beneficiary, share).send({from: sender});
  const removeBeneficiary = async (contract, sender, beneficiary) => contract.methods.removeBeneficiary(beneficiary).send({from: sender});
  const isBeneficiary = async (contract, sender, beneficiary) => contract.methods.isBeneficiary(beneficiary).call({from: sender});
  const beneficiaryShare = async (contract, sender, beneficiary) => contract.methods.beneficiaryShare(beneficiary).call({from: sender});
  const beneficiaryCount = async (contract, sender) => contract.methods.beneficiaryCount().call({from: sender});
  const totalShares = async (contract, sender) => contract.methods.totalShares().call({from: sender});
  const reward = async (contract, sender, beneficiaries, kind) => contract.methods.reward(beneficiaries, kind).call({from: sender});

  let web3;
  let deployer;
  let owner;
  let otherUser;
  let superUser;
  let newOwner;
  let exampleBeneficiaries;

  before(async () => {
    web3 = await createWeb3();
    [deployer, owner, otherUser, superUser, newOwner] = await web3.eth.getAccounts();
    exampleBeneficiaries = Array(3)
      .fill(null)
      .map(() => web3.eth.accounts.create().address);
  });

  describe('constructor', () => {
    let contract;

    before(async () => {
      contract = await deploy(web3, deployer, owner, superUser);
    });

    it('sets the owner', async () => {
      const storedOwner = await getOwner(contract);
      expect(storedOwner).to.equal(owner);
    });

    it('sets the total share counter to zero', async () => {
      expect(await totalShares(contract, owner)).to.equal('0');
    });

    it('starts with no beneficieries', async () => {
      expect(await beneficiaryCount(contract, owner)).to.equal('0');
    });
  });

  describe('transferring ownership', () => {
    let contract;

    beforeEach(async () => {
      contract = await deploy(web3, deployer, owner, superUser);
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

  describe('addBeneficiary', () => {
    let contract;

    beforeEach(async () => {
      contract = await deploy(web3, deployer, owner, superUser);
    });

    it('creates an entry with the address and share of the beneficiary', async () => {
      await expect(addBeneficiary(contract, owner, exampleBeneficiaries[0], '1002')).to.be.eventually.fulfilled;

      expect(await isBeneficiary(contract, owner, exampleBeneficiaries[0])).to.be.true;
      expect(await beneficiaryShare(contract, owner, exampleBeneficiaries[0])).to.equal('1002');
      expect(await isBeneficiary(contract, owner, otherUser)).to.be.false;
    });

    it('increases the total shares counter', async () => {
      addBeneficiary(contract, owner, exampleBeneficiaries[0], '1002');
      expect(await totalShares(contract, owner)).to.equal('1002');
      addBeneficiary(contract, owner, exampleBeneficiaries[1], '2093');
      expect(await totalShares(contract, owner)).to.equal('3095');
    });

    it('increases the beneficiary counter', async () => {
      addBeneficiary(contract, owner, exampleBeneficiaries[0], '1002');
      expect(await beneficiaryCount(contract, owner)).to.equal('1');
      addBeneficiary(contract, owner, exampleBeneficiaries[1], '2093');
      expect(await beneficiaryCount(contract, owner)).to.equal('2');
    });

    it('fails if subject is already added as a beneficiary', async () => {
      await expect(addBeneficiary(contract, owner, exampleBeneficiaries[0], '1002')).to.be.eventually.fulfilled;
      await expect(addBeneficiary(contract, owner, exampleBeneficiaries[0], '1002')).to.be.eventually.rejected;
    });

    it('fails if the share is 0', async () => {
      await expect(addBeneficiary(contract, owner, exampleBeneficiaries[0], '0')).to.be.eventually.rejected;
    });

    it('can only be called by owner', async () => {
      await expect(addBeneficiary(contract, otherUser, exampleBeneficiaries[0], '1002')).to.be.eventually.rejected;
    });
  });

  describe('removeBeneficiary', () => {
    let contract;

    beforeEach(async () => {
      contract = await deploy(web3, deployer, owner, superUser);
      await addBeneficiary(contract, owner, exampleBeneficiaries[0], '1021');
      await addBeneficiary(contract, owner, exampleBeneficiaries[1], '5007');
    });

    it('drops the entry with the address and share of the beneficiary', async () => {
      await expect(removeBeneficiary(contract, owner, exampleBeneficiaries[0])).to.eventually.be.fulfilled;
      expect(await isBeneficiary(contract, owner, exampleBeneficiaries[0])).to.be.false;
    });

    it('decreases the total shares counter', async () => {
      await removeBeneficiary(contract, owner, exampleBeneficiaries[0]);
      expect(await totalShares(contract, owner)).to.equal('5007');
      await removeBeneficiary(contract, owner, exampleBeneficiaries[1]);
      expect(await totalShares(contract, owner)).to.equal('0');
    });

    it('decreases the beneficiary counter', async () => {
      expect(await beneficiaryCount(contract, owner)).to.equal('2');
      await removeBeneficiary(contract, owner, exampleBeneficiaries[0]);
      expect(await beneficiaryCount(contract, owner)).to.equal('1');
      await removeBeneficiary(contract, owner, exampleBeneficiaries[1]);
      expect(await beneficiaryCount(contract, owner)).to.equal('0');
    });

    it('fails if subject is not added as a beneficiary', async () => {
      await expect(removeBeneficiary(contract, owner, exampleBeneficiaries[3])).to.eventually.be.rejected;
    });

    it('can only be called by owner', async () => {
      await expect(removeBeneficiary(contract, otherUser, exampleBeneficiaries[0])).to.eventually.be.rejected;
    });
  });

  describe('reward', () => {
    let contract;
    let kinds;
    let oneEther;

    beforeEach(async () => {
      contract = await deploy(web3, deployer, owner, superUser);
      kinds = Array(exampleBeneficiaries.length).fill(0);
      oneEther = web3.utils.toWei('1', 'ether');
    });

    it('assigns a reward of 1 ether to every address provided in the parameters', async () => {
      const rewards = await reward(contract, superUser, exampleBeneficiaries, kinds);
      const {0: rewardedAddresses, 1: rewardedValues} = rewards;
      expect(rewardedAddresses).to.have.members(exampleBeneficiaries);
      expect(rewardedValues).to.deep.equal(Array(exampleBeneficiaries.length).fill(oneEther));
    });

    it('fails if a different number of beneficiaries and reward kinds is provided', async () => {
      await expect(reward(contract, superUser, exampleBeneficiaries, kinds.slice(1))).to.be.rejected;
    });

    it('fails for non-SUPER_USER', async () => {
      await expect(reward(contract, owner, exampleBeneficiaries, kinds)).to.be.rejected;
    });
  });
});
