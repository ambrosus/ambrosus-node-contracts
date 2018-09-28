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
import ConstructorOwnableJson from '../../../src/contracts/ConstructorOwnable.json';

const {expect} = chai;
chai.use(chaiAsPromised);
chai.use(chaiEmitEvents);

describe('ConstructorOwnable base contract', () => {
  const standardOptions = {
    gas: 1000000
  };

  const deploy = async (web3, sender, owner) => deployContract(web3, ConstructorOwnableJson, [owner], {from: sender});
  const getOwner = async (contract) => contract.methods.owner().call();
  const transferOwnership = async (contract, sender, newOwner) => contract.methods.transferOwnership(newOwner).send({...standardOptions, from: sender});

  let web3;
  let owner;
  let deployer;
  let otherUser;
  let newOwner;
  let contract;
  let snapshotId;

  before(async () => {
    web3 = await createWeb3();
    [deployer, owner, otherUser, newOwner] = await web3.eth.getAccounts();
    contract = await deploy(web3, deployer, owner);
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
  });

  describe('transferring ownership', () => {
    let contract;

    beforeEach(async () => {
      contract = await deploy(web3, deployer, owner);
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
