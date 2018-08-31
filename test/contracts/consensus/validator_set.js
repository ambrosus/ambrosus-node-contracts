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
import ValidatorSetJson from '../../../build/contracts/ValidatorSet.json';

const {expect} = chai;
chai.use(chaiAsPromised);
chai.use(chaiEmitEvents);

describe('Validator set contract', () => {
  const standardOptions = {
    gas: 1000000
  };

  const deploy = async (web3, sender, initialValidators, superUser) => deployContract(web3, ValidatorSetJson, [sender, initialValidators, superUser], {from: sender});
  const getOwner = async (contract) => contract.methods.owner().call();
  const transferOwnership = async (contract, sender, newOwner) => contract.methods.transferOwnership(newOwner).send({...standardOptions, from: sender});
  const addValidator = async (contract, sender, validator) => contract.methods.addValidator(validator).send({...standardOptions, from: sender});
  const removeValidator = async (contract, sender, validator) => contract.methods.removeValidator(validator).send({...standardOptions, from: sender});
  const getValidators = async (contract) => contract.methods.getValidators().call();
  const getPendingValidators = async (contract) => contract.methods.getPendingValidators().call();
  const finalizeChange = async (contract, sender) => contract.methods.finalizeChange().send({...standardOptions, from: sender});

  let web3;
  let owner;
  let otherUser;
  let superUser;
  let newOwner;
  let exampleValidatorAddresses;

  before(async () => {
    web3 = await createWeb3();
    [owner, otherUser, superUser, newOwner] = await web3.eth.getAccounts();
    exampleValidatorAddresses = Array(3)
      .fill(null)
      .map(() => web3.eth.accounts.create().address);
  });

  describe('constructor', () => {
    let contract;

    before(async () => {
      contract = await deploy(web3, owner, exampleValidatorAddresses, superUser);
    });

    it('sets the initial validators from the parameter', async () => {
      const storedValidators = await getValidators(contract);
      expect(storedValidators).to.have.same.members(exampleValidatorAddresses);
    });

    it('sets the owner', async () => {
      const storedOwner = await getOwner(contract);
      expect(storedOwner).to.equal(owner);
    });
  });

  describe('adding a validator', () => {
    let contract;
    let validator;

    beforeEach(async () => {
      contract = await deploy(web3, owner, [], superUser);
      [validator] = exampleValidatorAddresses;
    });

    it('adds the new validator to the pendingValidators list', async () => {
      await expect(addValidator(contract, owner, validator)).to.be.fulfilled;
      expect(await getPendingValidators(contract)).to.have.same.members([validator]);
    });

    it(`doesn't change the validator list`, async () => {
      await expect(addValidator(contract, owner, validator)).to.be.fulfilled;
      expect(await getValidators(contract)).to.have.be.empty;
    });

    it(`fails on duplicate insertions`, async () => {
      expect(await getPendingValidators(contract)).to.have.lengthOf(0);
      await expect(addValidator(contract, owner, validator)).to.be.fulfilled;
      expect(await getPendingValidators(contract)).to.have.same.members([validator]);
      await expect(addValidator(contract, owner, validator)).to.be.rejected;
      expect(await getPendingValidators(contract)).to.have.same.members([validator]);
    });

    it('emits a InitiateChange event', async () => {
      expect(await addValidator(contract, owner, validator)).to.emitEvent('InitiateChange');
    });

    it(`can't be invoked by non-owner`, async () => {
      await expect(addValidator(contract, otherUser, validator)).to.be.rejected;
    });
  });

  describe('removing a validator', () => {
    let contract;
    let initialValidator;
    let initialValidators;
    let nonValidator;

    beforeEach(async () => {
      [initialValidator, nonValidator] = exampleValidatorAddresses;
      initialValidators = [initialValidator];
      contract = await deploy(web3, owner, initialValidators, superUser);
    });

    it('removes the validator from the pendingValidators list', async () => {
      await expect(removeValidator(contract, owner, initialValidator)).to.be.fulfilled;
      expect(await getPendingValidators(contract)).to.be.empty;
    });

    it(`doesn't change the validator list`, async () => {
      await expect(removeValidator(contract, owner, initialValidator)).to.be.fulfilled;
      expect(await getValidators(contract)).to.have.same.members(initialValidators);
    });

    it(`fails when removing an validator that never was registered`, async () => {
      await expect(removeValidator(contract, owner, nonValidator)).to.be.rejected;
    });

    it(`fails when removing an previously registered validator twice`, async () => {
      await expect(removeValidator(contract, owner, initialValidator)).to.be.fulfilled;
      await expect(removeValidator(contract, owner, initialValidator)).to.be.rejected;
    });

    it('emits a InitiateChange event', async () => {
      expect(await removeValidator(contract, owner, initialValidator)).to.emitEvent('InitiateChange');
    });

    it(`can't be invoked by non-owner`, async () => {
      await expect(removeValidator(contract, otherUser, initialValidators)).to.be.rejected;
    });
  });

  describe('finalising the validators change', () => {
    let contract;

    before(async () => {
      contract = await deploy(web3, owner, [], superUser);
    });

    // Note: according to spec the finalizeChange method is called internally by Parity using the special SUPER_USER address.
    // As we can't use it our selfs for tests, we inject a different address using the constructor
    it('copies the contents of the pendingValidators array into the validators array', async () => {
      for (const address of exampleValidatorAddresses) {
        await addValidator(contract, owner, address);
      }
      expect(await getPendingValidators(contract)).to.not.have.same.members(await getValidators(contract));

      await expect(finalizeChange(contract, superUser)).to.be.fulfilled;

      expect(await getPendingValidators(contract)).to.have.same.members(await getValidators(contract));
    });

    it('fails for non-SUPER_USER', async () => {
      await expect(finalizeChange(contract, owner)).to.be.rejected;
    });
  });

  describe('transferring ownership', () => {
    let contract;

    beforeEach(async () => {
      contract = await deploy(web3, owner, [], superUser);
    });

    it('sets the new owner', async () => {
      await expect(transferOwnership(contract, owner, newOwner)).to.be.fulfilled;
      expect(await getOwner(contract)).to.equal(newOwner);
    });

    it('emits a OwnershipTransferred event', async () => {
      expect(await transferOwnership(contract, owner, newOwner)).to.emitEvent('OwnershipTransferred');
    });

    it(`can't be invoked by non-owner`, async () => {
      await expect(transferOwnership(contract, otherUser, newOwner)).to.be.rejected;
    });
  });
});
