/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {deployContract, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import {createWeb3Ganache} from '../../utils/web3_tools';
import chaiEmitEvents from '../../helpers/chaiEmitEvents';
import ValidatorSetJson from '../../../src/contracts/ValidatorSet.json';

const {expect} = chai;
chai.use(chaiAsPromised);
chai.use(chaiEmitEvents);

describe('Validator set contract', () => {
  const standardOptions = {
    gas: 1000000
  };

  const deploy = async (web3, sender, owner, initialValidators, superUser) => deployContract(web3, ValidatorSetJson, [owner, initialValidators, superUser], {from: sender});
  const getOwner = async (contract) => contract.methods.owner().call();
  const transferOwnership = async (contract, sender, newOwner) => contract.methods.transferOwnership(newOwner).send({...standardOptions, from: sender});
  const addValidator = async (contract, sender, validator) => contract.methods.addValidator(validator).send({...standardOptions, from: sender});
  const removeValidator = async (contract, sender, validator) => contract.methods.removeValidator(validator).send({...standardOptions, from: sender});
  const getValidators = async (contract) => contract.methods.getValidators().call();
  const getPendingValidators = async (contract) => contract.methods.getPendingValidators().call();
  const finalizeChange = async (contract, sender) => contract.methods.finalizeChange().send({...standardOptions, from: sender});

  let web3;
  let deployer;
  let owner;
  let otherUser;
  let superUser;
  let newOwner;
  let exampleValidatorAddresses;
  let additionalValidator;

  before(async () => {
    web3 = await createWeb3Ganache();
    [deployer, owner, otherUser, superUser, newOwner] = await web3.eth.getAccounts();
    exampleValidatorAddresses = Array(3)
      .fill(null)
      .map(() => web3.eth.accounts.create().address);
    additionalValidator = web3.eth.accounts.create().address;
  });

  describe('constructor', () => {
    let contract;

    before(async () => {
      contract = await deploy(web3, deployer, owner, exampleValidatorAddresses, superUser);
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

  describe('constructor - fail safes', () => {
    // NOTE: web3 incorrectly reports a failed deployment as successful, as a workaround we try to call a different method which should then fail.
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    it('throws if no initial validators are provided', async () => {
      await expect(deploy(web3, deployer, owner, [], superUser)).to.eventually.be.rejected;
    });

    it('throws if super user  is 0x0', async () => {
      await expect(deploy(web3, deployer, owner, exampleValidatorAddresses, zeroAddress)).to.eventually.be.rejected;
    });

    it('throws if owner is 0x0', async () => {
      await expect(deploy(web3, deployer, zeroAddress, exampleValidatorAddresses, superUser)).to.eventually.be.rejected;
    });
  });

  describe('adding a validator', () => {
    let contract;
    let snapshotId;

    before(async () => {
      contract = await deploy(web3, deployer, owner, exampleValidatorAddresses, superUser);
    });

    beforeEach(async () => {
      snapshotId = await makeSnapshot(web3);
    });

    afterEach(async () => {
      await restoreSnapshot(web3, snapshotId);
    });

    it('adds the new validator to the pendingValidators list', async () => {
      await expect(addValidator(contract, owner, additionalValidator)).to.be.fulfilled;
      expect(await getPendingValidators(contract)).to.have.same.members([...exampleValidatorAddresses, additionalValidator]);
    });

    it(`doesn't change the validator list`, async () => {
      await expect(addValidator(contract, owner, additionalValidator)).to.be.fulfilled;
      expect(await getValidators(contract)).to.have.same.members(exampleValidatorAddresses);
    });

    it(`fails on duplicate insertions`, async () => {
      expect(await getPendingValidators(contract)).to.have.same.members(exampleValidatorAddresses);
      await expect(addValidator(contract, owner, additionalValidator)).to.be.fulfilled;
      expect(await getPendingValidators(contract)).to.have.same.members([...exampleValidatorAddresses, additionalValidator]);
      await expect(addValidator(contract, owner, additionalValidator)).to.be.rejected;
      expect(await getPendingValidators(contract)).to.have.same.members([...exampleValidatorAddresses, additionalValidator]);
    });

    it('emits a InitiateChange event', async () => {
      expect(await addValidator(contract, owner, additionalValidator)).to.emitEvent('InitiateChange');
    });

    it(`can't be invoked by non-owner`, async () => {
      await expect(addValidator(contract, otherUser, additionalValidator)).to.be.rejected;
    });
  });

  describe('removing a validator', () => {
    let contract;
    let initialValidator;
    let initialValidators;
    let nonValidator;
    let snapshotId;

    before(async () => {
      [initialValidator, nonValidator] = exampleValidatorAddresses;
      initialValidators = [initialValidator];
      contract = await deploy(web3, deployer, owner, initialValidators, superUser);
    });

    beforeEach(async () => {
      snapshotId = await makeSnapshot(web3);
    });

    afterEach(async () => {
      await restoreSnapshot(web3, snapshotId);
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
      contract = await deploy(web3, deployer, owner, exampleValidatorAddresses, superUser);
    });

    // Note: according to spec the finalizeChange method is called internally by Parity using the special SUPER_USER address.
    // As we can't use it our selfs for tests, we inject a different address using the constructor
    it('copies the contents of the pendingValidators array into the validators array', async () => {
      await addValidator(contract, owner, additionalValidator);
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
    let snapshotId;

    before(async () => {
      contract = await deploy(web3, deployer, owner, exampleValidatorAddresses, superUser);
    });

    beforeEach(async () => {
      snapshotId = await makeSnapshot(web3);
    });

    afterEach(async () => {
      await restoreSnapshot(web3, snapshotId);
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
});
