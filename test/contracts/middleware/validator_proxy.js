/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createWeb3, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import chaiEmitEvents from '../../helpers/chaiEmitEvents';
import deploy from '../../helpers/deploy';

const {expect} = chai;
chai.use(chaiAsPromised);
chai.use(chaiEmitEvents);

describe('ValidatorProxy', () => {
  const standardOptions = {
    gas: 1000000
  };

  const baseReward = '2000000000000000000';

  const deployContracts = async (web3, sender, initialValidators, initialBeneficiaries) => {
    const superUser = '0x000000000000000000000000000000000000000F';
    ({validatorProxy, validatorSet, blockRewards} = await deploy({
      web3,
      contracts: {
        validatorSet: true,
        blockRewards: true,
        validatorProxy: true
      },
      params: {
        validatorSet: {
          owner: sender,
          initialValidators,
          superUser
        },
        blockRewards: {
          owner: sender,
          baseReward,
          superUser
        }
      }
    }));
    await transferOwnershipForBlockRewards(validatorProxy, sender, sender);
    for (const [key, value] of Object.entries(initialBeneficiaries)) {
      await blockRewards.methods.addBeneficiary(key, value).send({...standardOptions, from: sender});
    }
    await transferOwnership(blockRewards, sender, validatorProxy.options.address);
    return {
      validatorProxy,
      validatorSet,
      blockRewards
    };
  };

  const getOwner = async (contract) => contract.methods.owner().call();
  const getValidatorSet = async (contract) => contract.methods.validatorSet().call();
  const getBlockRewards = async (contract) => contract.methods.blockRewards().call();
  const setBaseReward = async (contract, sender, baseReward) => contract.methods.setBaseReward(baseReward).send({...standardOptions, from: sender});
  const transferOwnership = async (contract, sender, newOwner) => contract.methods.transferOwnership(newOwner).send({...standardOptions, from: sender});
  const transferOwnershipForValidatorSet = async (contract, sender, newOwner) => contract.methods.transferOwnershipForValidatorSet(newOwner).send({...standardOptions, from: sender});
  const transferOwnershipForBlockRewards = async (contract, sender, newOwner) => contract.methods.transferOwnershipForBlockRewards(newOwner).send({...standardOptions, from: sender});
  const addValidator = async (contract, sender, validator, share) => contract.methods.addValidator(validator, share).send({...standardOptions, from: sender});
  const removeValidator = async (contract, sender, validator) => contract.methods.removeValidator(validator).send({...standardOptions, from: sender});

  const getPendingValidators = async (contract) => contract.methods.getPendingValidators().call();
  const isBeneficiary = async (contract, address) => contract.methods.isBeneficiary(address).call();
  const beneficiaryShare = async (contract, address) => contract.methods.beneficiaryShare(address).call();
  const getBaseReward = async (contract) => contract.methods.baseReward().call();


  let web3;
  let owner;
  let otherUser;
  let newOwner;
  let initialValidators;
  let initialBeneficiaries;
  let newValidator;
  let notValidator;

  let validatorProxy;
  let blockRewards;
  let validatorSet;

  let snapshotId;

  before(async () => {
    web3 = await createWeb3();
    [owner, otherUser, newOwner] = await web3.eth.getAccounts();
    initialValidators = [
      web3.eth.accounts.create().address,
      web3.eth.accounts.create().address,
      web3.eth.accounts.create().address
    ];
    initialBeneficiaries = {
      [web3.eth.accounts.create().address]: '2'
    };
    newValidator = web3.eth.accounts.create().address;
    notValidator = web3.eth.accounts.create().address;

    ({validatorProxy, blockRewards, validatorSet} = await deployContracts(web3, owner, initialValidators, initialBeneficiaries));
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('constructor', () => {
    it('sets the owner', async () => {
      const storedOwner = await getOwner(validatorProxy);
      expect(storedOwner).to.equal(owner);
    });

    it('stores validatorSet contract address', async () => {
      const storedValidatorSet = await getValidatorSet(validatorProxy);
      expect(storedValidatorSet).to.equal(validatorSet.options.address);
    });

    it('stores blockRewards contract address', async () => {
      const storedBlockRewards = await getBlockRewards(validatorProxy);
      expect(storedBlockRewards).to.equal(blockRewards.options.address);
    });
  });

  describe('transferring ownership', () => {
    describe('for self', () => {
      it('sets the new owner', async () => {
        expect(await getOwner(validatorProxy)).to.equal(owner);
        await expect(transferOwnership(validatorProxy, owner, newOwner)).to.be.fulfilled;
        expect(await getOwner(validatorProxy)).to.equal(newOwner);
      });

      it('emits a OwnershipTransferred event', async () => {
        expect(await transferOwnership(validatorProxy, owner, newOwner)).to.emitEvent('OwnershipTransferred');
      });

      it(`to 0x0 address is not allowed`, async () => {
        await expect(transferOwnership(validatorProxy, owner, '0x0')).to.be.rejected;
      });

      it(`can't be invoked by non-owner`, async () => {
        await expect(transferOwnership(validatorProxy, otherUser, newOwner)).to.be.rejected;
      });
    });

    describe('for ValidatorSet', () => {
      it('proxies the call to the contract', async () => {
        expect(await getOwner(validatorSet)).to.equal(validatorProxy.options.address);
        await expect(transferOwnershipForValidatorSet(validatorProxy, owner, newOwner)).to.be.fulfilled;
        expect(await getOwner(validatorSet)).to.equal(newOwner);
      });

      it(`can't be invoked by non-owner`, async () => {
        await expect(transferOwnershipForValidatorSet(validatorProxy, otherUser, newOwner)).to.be.rejected;
      });
    });

    describe('for BlockRewards', () => {
      it('proxies the call to the contract', async () => {
        expect(await getOwner(blockRewards)).to.equal(validatorProxy.options.address);
        await expect(transferOwnershipForBlockRewards(validatorProxy, owner, newOwner)).to.be.fulfilled;
        expect(await getOwner(blockRewards)).to.equal(newOwner);
      });

      it(`can't be invoked by non-owner`, async () => {
        await expect(transferOwnershipForBlockRewards(validatorProxy, otherUser, newOwner)).to.be.rejected;
      });
    });
  });

  describe('set base reward', () => {
    const newBaseReward = '42000000000000000000';

    it('changes the base block reward', async () => {
      expect(await getBaseReward(blockRewards)).to.equal(baseReward);
      await expect(setBaseReward(validatorProxy, owner, newBaseReward)).to.be.fulfilled;
      expect(await getBaseReward(blockRewards)).to.equal(newBaseReward);
    });

    it(`can't be invoked by non-owner`, async () => {
      await expect(setBaseReward(validatorProxy, otherUser, newBaseReward)).to.be.rejected;
    });
  });

  describe('addValidator', () => {
    it('adds the address to the validator set (pending list)', async () => {
      const validatorsBefore = await getPendingValidators(validatorSet);
      await expect(addValidator(validatorProxy, owner, newValidator, '1')).to.eventually.be.fulfilled;
      const validatorsAfter = await getPendingValidators(validatorSet);
      expect(validatorsAfter).to.have.members([...validatorsBefore, newValidator]);
    });

    it('skips adding the address to the validatorSet if it already there', async () => {
      const validatorsBefore = await getPendingValidators(validatorSet);
      await expect(addValidator(validatorProxy, owner, initialValidators[0], '1')).to.eventually.be.fulfilled;
      const validatorsAfter = await getPendingValidators(validatorSet);
      expect(validatorsAfter).to.have.members(validatorsBefore);
    });

    it('adds the address to the blockRewards', async () => {
      expect(await isBeneficiary(blockRewards, newValidator)).to.be.false;
      await expect(addValidator(validatorProxy, owner, newValidator, '1')).to.eventually.be.fulfilled;
      expect(await isBeneficiary(blockRewards, newValidator)).to.be.true;
      expect(await beneficiaryShare(blockRewards, newValidator)).to.equal('1');
    });

    it('skips adding the address to the blockRewards if it is already there with the same share', async () => {
      const [[beneficiary, share]] = Object.entries(initialBeneficiaries);
      expect(await isBeneficiary(blockRewards, beneficiary)).to.be.true;
      await expect(addValidator(validatorProxy, owner, beneficiary, share)).to.eventually.be.fulfilled;
      expect(await isBeneficiary(blockRewards, beneficiary)).to.be.true;
    });

    it('fails if the address is already in the blockRewards with a different share', async () => {
      const [[beneficiary, share]] = Object.entries(initialBeneficiaries);
      expect(await isBeneficiary(blockRewards, beneficiary)).to.be.true;
      expect(share).to.not.be.equal('90');
      await expect(addValidator(validatorProxy, owner, beneficiary, '90')).to.eventually.be.rejected;
    });

    it(`is a contextInternalCall`, async () => {
      await expect(addValidator(validatorProxy, otherUser, newValidator, '1')).to.eventually.be.rejected;
    });
  });

  describe('remove validator', () => {
    beforeEach(async () => {
      await addValidator(validatorProxy, owner, newValidator, '10');
    });

    it('removes the address from the validator set', async () => {
      expect(await getPendingValidators(validatorSet)).to.include(newValidator);
      await expect(removeValidator(validatorProxy, owner, newValidator)).to.eventually.be.fulfilled;
      expect(await getPendingValidators(validatorSet)).to.not.include(newValidator);
    });

    it('skips if the address is not in the validator set', async () => {
      expect(await getPendingValidators(validatorSet)).to.not.include(notValidator);
      await expect(removeValidator(validatorProxy, owner, notValidator)).to.eventually.be.fulfilled;
    });

    it('removes the address from the blockRewards', async () => {
      expect(await isBeneficiary(blockRewards, newValidator)).to.be.true;
      await expect(removeValidator(validatorProxy, owner, newValidator)).to.eventually.be.fulfilled;
      expect(await isBeneficiary(blockRewards, newValidator)).to.be.false;
    });

    it('skips if the address is not a in the blockRewards list', async () => {
      expect(await isBeneficiary(blockRewards, notValidator)).to.be.false;
      await expect(removeValidator(validatorProxy, owner, notValidator)).to.eventually.be.fulfilled;
    });

    it(`is a contextInternalCall`, async () => {
      await expect(removeValidator(validatorProxy, otherUser, newValidator)).to.eventually.be.rejected;
    });
  });
});
