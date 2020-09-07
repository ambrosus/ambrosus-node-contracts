/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createWeb3, makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import deploy from '../../helpers/deploy';
import {APOLLO, HERMES, APOLLO_DEPOSIT} from '../../../src/constants';

chai.use(chaiAsPromised);
const {expect} = chai;

describe('Multiplexer', () => {
  let web3;
  let oldOwner;
  let newOwner;
  let otherAddress;
  let apollo;
  let developer;
  let support;
  let superUser;
  let head;
  let multiplexer;
  let kycWhitelist;
  let fees;
  let roles;
  let validatorSet;
  let blockRewards;
  let validatorProxy;
  let apolloDepositStore;
  let snapshotId;

  const transferOwnership = (newOwner, from = oldOwner) => multiplexer.methods.transferContractsOwnership(newOwner).send({from});
  const changeContext = (newContext, from = oldOwner) => multiplexer.methods.changeContext(newContext).send({from});
  const addToWhitelistAsHermes = (candidate, from = oldOwner) => multiplexer.methods.addToWhitelist(candidate, HERMES, 0).send({from});
  const addToWhitelistAsApollo = (candidate, from = oldOwner) => multiplexer.methods.addToWhitelist(candidate, APOLLO, APOLLO_DEPOSIT).send({from});
  const isDepositing = async (address) => apolloDepositStore.methods.isDepositing(address).call();
  const onboardAsApollo = async (sender, value) => roles.methods.onboardAsApollo().send({from: sender, value});
  const removeFromWhitelist = (candidate, from = oldOwner) => multiplexer.methods.removeFromWhitelist(candidate).send({from});
  const retireApollo = (candidate, from = oldOwner) => multiplexer.methods.retireApollo(candidate).send({from});
  const setBaseUploadFee = (fee, from = oldOwner) => multiplexer.methods.setBaseUploadFee(fee).send({from});
  const transferOwnershipForValidatorSet = (newOwner, from = oldOwner) => multiplexer.methods.transferOwnershipForValidatorSet(newOwner).send({from});
  const transferOwnershipForBlockRewards = (newOwner, from = oldOwner) => multiplexer.methods.transferOwnershipForBlockRewards(newOwner).send({from});
  const setBaseReward = (newBaseReward, from = oldOwner) => multiplexer.methods.setBaseReward(newBaseReward).send({from});
  const setDeveloperFee = (developerFee, from = oldOwner) => multiplexer.methods.setDeveloperFee(developerFee).send({from});
  const setSupportFee = (support, supportFee, from = oldOwner) => multiplexer.methods.setSupportFee(support, supportFee).send({from});
  const setDeveloper = (developer, from = oldOwner) => multiplexer.methods.setDeveloper(developer).send({from});

  const baseReward = '2000000000000000000';

  before(async () => {
    web3 = await createWeb3();
    [oldOwner, newOwner, otherAddress, superUser, apollo, developer, support] = await web3.eth.getAccounts();
    ({head, multiplexer, kycWhitelist, fees, roles, validatorProxy, validatorSet, blockRewards, apolloDepositStore} = await deploy({
      web3,
      contracts: {
        multiplexer: true,
        kycWhitelist: true,
        fees: true,
        validatorProxy: true,
        blockRewards: true,
        validatorSet: true,
        kycWhitelistStore: true,
        roles: true,
        rolesStore: true,
        apolloDepositStore: true,
        config: true,
        time: true,
        rolesEventEmitter: true
      },
      params: {
        multiplexer: {
          owner: oldOwner
        },
        blockRewards: {
          owner: oldOwner,
          baseReward,
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

  describe('Retire apollo', () => {
    beforeEach(async () => {
      await addToWhitelistAsApollo(apollo);
      await onboardAsApollo(apollo, APOLLO_DEPOSIT);
    });

    it('retire', async () => {
      await retireApollo(apollo);
      expect(await isDepositing(apollo)).to.be.false;
    });

    it('throws when not an owner retire apollo', async () => {
      await expect(retireApollo(apollo, otherAddress)).to.be.rejected;
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

  describe('Set developer fee', () => {
    const exampleDeveloperFee = '500000';

    it('sets developer fee', async () => {
      await setDeveloperFee(exampleDeveloperFee);
      expect(await fees.methods.developerUploadFeePPM().call()).to.equal(exampleDeveloperFee);
    });

    it('throws when not an owner tries to change developer fee', async () => {
      await expect(setDeveloperFee(otherAddress, otherAddress)).to.be.rejected;
    });
  });

  describe('Set developer account', () => {
    it('sets developer account', async () => {
      await setDeveloper(developer);
      expect(await fees.methods.developer().call()).to.equal(developer);
    });

    it('throws when not an owner tries to change developer account', async () => {
      await expect(setDeveloper(otherAddress, otherAddress)).to.be.rejected;
    });
  });

  describe('Set support fee', () => {
    const exampleSupportFee = '500000';

    it('sets support fee', async () => {
      await setSupportFee(support, exampleSupportFee);
      expect(await fees.methods.support().call()).to.equal(support);
      expect(await fees.methods.supportFeePPM().call()).to.equal(exampleSupportFee);
    });

    it('throws when not an owner tries to change developer fee', async () => {
      await expect(setDeveloperFee(otherAddress, otherAddress)).to.be.rejected;
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

  describe('Set base reward', () => {
    it('transfers block rewards ownership', async () => {
      await setBaseReward('10');
      expect(await blockRewards.methods.baseReward().call()).to.equal('10');
    });

    it('throws when not an owner tries to change base reward=', async () => {
      await expect(setBaseReward('10', otherAddress)).to.be.rejected;
    });
  });
});
