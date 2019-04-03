/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createWeb3, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import deploy from '../../helpers/deploy';
import {HERMES} from '../../../src/constants';

chai.use(chaiAsPromised);
const {expect} = chai;

describe('Multiplexer', () => {
  let web3;
  let oldOwner;
  let newOwner;
  let otherAddress;
  let superUser;
  let head;
  let multiplexer;
  let kycWhitelist;
  let fees;
  let validatorSet;
  let blockRewards;
  let validatorProxy;
  let snapshotId;

  const transferOwnership = (newOwner, from = oldOwner) => multiplexer.methods.transferContractsOwnership(newOwner).send({from});
  const changeContext = (newContext, from = oldOwner) => multiplexer.methods.changeContext(newContext).send({from});
  const addToWhitelistAsHermes = (candidate, from = oldOwner) => multiplexer.methods.addToWhitelist(candidate, HERMES, 0).send({from});
  const removeFromWhitelist = (candidate, from = oldOwner) => multiplexer.methods.removeFromWhitelist(candidate).send({from});
  const setBaseUploadFee = (fee, from = oldOwner) => multiplexer.methods.setBaseUploadFee(fee).send({from});
  const transferOwnershipForValidatorSet = (newOwner, from = oldOwner) => multiplexer.methods.transferOwnershipForValidatorSet(newOwner).send({from});
  const transferOwnershipForBlockRewards = (newOwner, from = oldOwner) => multiplexer.methods.transferOwnershipForBlockRewards(newOwner).send({from});


  before(async () => {
    web3 = await createWeb3();
    [oldOwner, newOwner, otherAddress, superUser] = await web3.eth.getAccounts();
    ({head, multiplexer, kycWhitelist, fees, validatorProxy, validatorSet, blockRewards} = await deploy({
      web3,
      contracts: {
        multiplexer: true,
        kycWhitelist: true,
        fees: true,
        validatorProxy: true,
        blockRewards: true,
        validatorSet: true,
        kycWhitelistStore: true,
        config: true,
        time: true
      },
      params: {
        multiplexer: {
          owner: oldOwner
        },
        blockRewards: {
          owner: oldOwner,
          baseReward: 0,
          superUser
        },
        validatorSet: {
          owner: oldOwner,
          initialValidators: [otherAddress],
          superUser
        }
      }
    }));
    await head.methods.transferOwnership(multiplexer.options.address).send({from: oldOwner});
    await kycWhitelist.methods.transferOwnership(multiplexer.options.address).send({from: oldOwner});
    await fees.methods.transferOwnership(multiplexer.options.address).send({from: oldOwner});
    await validatorProxy.methods.transferOwnership(multiplexer.options.address).send({from: oldOwner});
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('Transfer Ownership', () => {
    it('changes owner of all controlled contracts', async () => {
      const assertNewOwner = async (contract) => expect(await contract.methods.owner().call()).to.equal(newOwner);

      await transferOwnership(newOwner);

      await assertNewOwner(head);
      await assertNewOwner(kycWhitelist);
      await assertNewOwner(fees);
      await assertNewOwner(validatorProxy);
    });

    it('throws when not an owner tries to change ownership', async () => {
      await expect(transferOwnership(newOwner, otherAddress)).to.be.rejected;
    });
  });

  describe('Change context', () => {
    it('changes context of head contract', async () => {
      await changeContext(otherAddress);
      expect(await head.methods.context().call()).to.equal(otherAddress);
    });

    it('throws when not an owner tries to change context', async () => {
      await expect(changeContext(otherAddress, otherAddress)).to.be.rejected;
    });
  });

  describe('Add to whitelist', () => {
    it('adds to whitelist', async () => {
      await addToWhitelistAsHermes(otherAddress);
      expect(await kycWhitelist.methods.isWhitelisted(otherAddress).call()).to.be.true;
      expect(await kycWhitelist.methods.hasRoleAssigned(otherAddress, HERMES).call()).to.be.true;
    });

    it('throws when not an owner adds to whitelist', async () => {
      await expect(addToWhitelistAsHermes(otherAddress, otherAddress)).to.be.rejected;
    });
  });

  describe('Remove from whitelist', () => {
    beforeEach(async () => {
      await addToWhitelistAsHermes(otherAddress);
    });

    it('removes from whitelist', async () => {
      await removeFromWhitelist(otherAddress);
      expect(await kycWhitelist.methods.isWhitelisted(otherAddress).call()).to.be.false;
    });

    it('throws when not an owner removes from whitelist', async () => {
      await expect(removeFromWhitelist(otherAddress, otherAddress)).to.be.rejected;
    });
  });

  describe('Set base upload fee', () => {
    const exampleUploadFee = '420';

    it('sets base upload fee', async () => {
      await setBaseUploadFee(exampleUploadFee);
      expect(await fees.methods.baseUploadFee().call()).to.equal(exampleUploadFee);
    });

    it('throws when not an owner tries to change fee', async () => {
      await expect(setBaseUploadFee(otherAddress, otherAddress)).to.be.rejected;
    });
  });

  describe('Transfer ownership for validator set', () => {
    it('transfers validator set ownership', async () => {
      await transferOwnershipForValidatorSet(otherAddress);
      expect(await validatorSet.methods.owner().call()).to.equal(otherAddress);
    });

    it('throws when not an owner tries to transfers validator set ownership', async () => {
      await expect(transferOwnershipForValidatorSet(otherAddress, otherAddress)).to.be.rejected;
    });
  });

  describe('Transfer ownership for block rewards', () => {
    it('transfers block rewards ownership', async () => {
      await transferOwnershipForBlockRewards(otherAddress);
      expect(await blockRewards.methods.owner().call()).to.equal(otherAddress);
    });

    it('throws when not an owner tries to transfers block rewards ownership', async () => {
      await expect(transferOwnershipForBlockRewards(otherAddress, otherAddress)).to.be.rejected;
    });
  });
});
