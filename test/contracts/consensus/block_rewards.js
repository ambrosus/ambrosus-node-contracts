/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createWeb3, deployContract, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import chaiEmitEvents from '../../helpers/chaiEmitEvents';
import BlockRewardsJson from '../../../src/contracts/BlockRewards.json';

const {expect} = chai;
chai.use(chaiAsPromised);
chai.use(chaiEmitEvents);

describe('Block rewards contract', () => {
  const standardOptions = {
    gas: 1000000
  };

  const deploy = async (web3, sender, owner, baseReward, superUser) => deployContract(web3, BlockRewardsJson, [owner, baseReward, superUser], {from: sender});
  const getOwner = async (contract) => contract.methods.owner().call();
  const transferOwnership = async (contract, sender, newOwner) => contract.methods.transferOwnership(newOwner).send({...standardOptions, from: sender});
  const addBeneficiary = async (contract, sender, beneficiary, share) => contract.methods.addBeneficiary(beneficiary, share).send({from: sender});
  const removeBeneficiary = async (contract, sender, beneficiary) => contract.methods.removeBeneficiary(beneficiary).send({from: sender});
  const setBaseReward = async (contract, sender, baseReward) => contract.methods.setBaseReward(baseReward).send({from: sender});
  const isBeneficiary = async (contract, sender, beneficiary) => contract.methods.isBeneficiary(beneficiary).call({from: sender});
  const beneficiaryShare = async (contract, sender, beneficiary) => contract.methods.beneficiaryShare(beneficiary).call({from: sender});
  const beneficiaryCount = async (contract, sender) => contract.methods.beneficiaryCount().call({from: sender});
  const totalShares = async (contract, sender) => contract.methods.totalShares().call({from: sender});
  const baseReward = async (contract, sender) => contract.methods.baseReward().call({from: sender});
  const reward = async (contract, sender, beneficiaries, kind) => contract.methods.reward(beneficiaries, kind).call({from: sender});
  const reformatRewards = (rewards) => {
    const {0: rewardedAddresses, 1: rewardedValues} = rewards;
    return rewardedAddresses.reduce(
      (acc, value, index) => {
        acc[value] = rewardedValues[index];
        return acc;
      },
      {});
  };

  let web3;
  let deployer;
  let owner;
  let otherUser;
  let superUser;
  let newOwner;
  let exampleBeneficiaries;
  const exampleBaseReward = '2000000000000000000';
  let contract;
  let snapshotId;

  before(async () => {
    web3 = await createWeb3();
    [deployer, owner, otherUser, superUser, newOwner] = await web3.eth.getAccounts();
    exampleBeneficiaries = Array(3)
      .fill(null)
      .map(() => web3.eth.accounts.create().address);
    contract = await deploy(web3, deployer, owner, exampleBaseReward, superUser);
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('constructor', () => {
    it('sets the owner', async () => {
      const storedOwner = await getOwner(contract);
      expect(storedOwner).to.equal(owner);
    });

    it('sets the total share counter to zero', async () => {
      expect(await totalShares(contract, owner)).to.equal('0');
    });

    it('starts with no beneficiaries', async () => {
      expect(await beneficiaryCount(contract, owner)).to.equal('0');
    });

    it('stores the base reward value', async () => {
      expect(await baseReward(contract, owner)).to.equal(exampleBaseReward);
    });
  });

  describe('transferring ownership', () => {
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
    beforeEach(async () => {
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

  describe('setBaseReward', () => {
    const exampleDifferentBaseReward = '2000000000000001234';

    it('changes base reward correctly', async () => {
      expect(await baseReward(contract, owner)).to.equal(exampleBaseReward);
      await expect(setBaseReward(contract, owner, exampleDifferentBaseReward)).to.eventually.be.fulfilled;
      expect(await baseReward(contract, owner)).to.equal(exampleDifferentBaseReward);
    });

    it('can only be called by owner', async () => {
      await expect(setBaseReward(contract, otherUser, exampleDifferentBaseReward)).to.eventually.be.rejected;
    });
  });

  describe('reward', () => {
    let kinds;

    beforeEach(async () => {
      await addBeneficiary(contract, owner, exampleBeneficiaries[0], '1021');
      await addBeneficiary(contract, owner, exampleBeneficiaries[1], '5007');
      await addBeneficiary(contract, owner, exampleBeneficiaries[2], '4821');
      kinds = Array(exampleBeneficiaries.length).fill(0);
    });

    it('assigns a reward proportional to the number of shares of a beneficiary in all shares', async () => {
      const rewards = reformatRewards(await reward(contract, superUser, exampleBeneficiaries, kinds));
      expect(rewards[exampleBeneficiaries[0]]).to.equal('564660337358281869');
      expect(rewards[exampleBeneficiaries[1]]).to.equal('2769103143146833809');
      expect(rewards[exampleBeneficiaries[2]]).to.equal('2666236519494884321');
    });

    it('assigns rewards of equal value for normal and empty blocks', async () => {
      const [subject] = exampleBeneficiaries;
      const rewards1 = reformatRewards(await reward(contract, superUser, [subject], ['0']));
      const rewards2 = reformatRewards(await reward(contract, superUser, [subject], ['2']));
      expect(rewards1[subject]).to.equal(rewards2[subject]);
    });

    it('assigns rewards only for normal and empty blocks, silently ignoring the rest', async () => {
      const rewards = reformatRewards(await reward(contract, superUser, exampleBeneficiaries, ['0', '1', '2']));
      expect(rewards).to.have.all.keys(exampleBeneficiaries[0], exampleBeneficiaries[2]);
    });

    it('assigns rewards only to registered beneficiaries, silently ignoring the rest', async () => {
      const rewards = reformatRewards(await reward(contract, superUser, [...exampleBeneficiaries, otherUser], ['0', '0', '0', '0']));
      expect(rewards).to.have.all.keys(exampleBeneficiaries);
    });

    it('fails if a different number of beneficiaries and reward kinds is provided', async () => {
      await expect(reward(contract, superUser, exampleBeneficiaries, kinds.slice(1))).to.be.rejected;
      await expect(reward(contract, superUser, exampleBeneficiaries.slice(1), kinds)).to.be.rejected;
    });

    it('fails for non-SUPER_USER', async () => {
      await expect(reward(contract, owner, exampleBeneficiaries, kinds)).to.be.rejected;
    });
  });
});
