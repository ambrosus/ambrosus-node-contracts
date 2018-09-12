/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3} from '../../../src/utils/web3_tools';
import deploy from '../../helpers/deploy';
import {ONE} from '../../helpers/consts';
import {
  APOLLO,
  APOLLO_DEPOSIT,
  ATLAS,
  ATLAS1_STAKE,
  ATLAS1_STORAGE_LIMIT,
  ATLAS2_STAKE,
  ATLAS2_STORAGE_LIMIT,
  ATLAS3_STAKE,
  ATLAS3_STORAGE_LIMIT,
  HERMES
} from '../../../src/consts';
import observeBalanceChange from '../../helpers/web3BalanceObserver';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;


describe('Roles Contract', () => {
  let web3;
  let roles;
  let kycWhitelist;
  let atlasStakeStore;
  let apolloDepositStore;
  let validatorSet;
  let blockRewards;
  let owner;
  let apollo;
  let atlas1;
  let atlas2;
  let atlas3;
  let hermes;

  const addToWhitelist = async (sender, address, role, deposit) => kycWhitelist.methods.add(address, role, deposit).send({from: sender});
  const onboardAsAtlas = async (url, sender, value) => roles.methods.onboardAsAtlas(url).send({from: sender, value});
  const onboardAsHermes = async (url, sender) => roles.methods.onboardAsHermes(url).send({from: sender});
  const onboardAsApollo = async (sender, value) => roles.methods.onboardAsApollo().send({from: sender, value});
  const retireAtlas = async (sender) => roles.methods.retireAtlas().send({from: sender, gasPrice: '0'});
  const retireHermes = async (sender) => roles.methods.retireHermes().send({from: sender});
  const retireApollo = async (sender) => roles.methods.retireApollo().send({from: sender, gasPrice: '0'});
  const canOnboardAsAtlas = async (address, value) => roles.methods.canOnboard(address, ATLAS, value).call();
  const canOnboardAsHermes = async (address, value) => roles.methods.canOnboard(address, HERMES, value).call();
  const canOnboardAsApollo = async (address, value) => roles.methods.canOnboard(address, APOLLO, value).call();
  const getRole = async (address) => roles.methods.getOnboardedRole(address).call();
  const getStorageLimitForAtlas = async (value) => roles.methods.getStorageLimitForAtlas(value).call();
  const getUrl = async (address) => roles.methods.getUrl(address).call();
  const getStake = async (address) => atlasStakeStore.methods.getStake(address).call();
  const isDepositing = async (address) => apolloDepositStore.methods.isDepositing(address).call();
  const getValidators = async () => validatorSet.methods.getPendingValidators().call();
  const isBeneficiary = async (address) => blockRewards.methods.isBeneficiary(address).call();
  const beneficiaryShare = async (address) => blockRewards.methods.beneficiaryShare(address).call();

  before(async () => {
    web3 = await createWeb3();
    [owner, apollo, atlas1, atlas2, atlas3, hermes] = await web3.eth.getAccounts();
  });

  beforeEach(async () => {
    ({web3, roles, kycWhitelist, atlasStakeStore, apolloDepositStore, validatorSet, blockRewards} = await deploy({
      web3,
      sender : owner,
      contracts: {
        roles: true,
        fees: true,
        time: true,
        config: true,
        kycWhitelist: true,
        atlasStakeStore: true,
        rolesStore: true,
        apolloDepositStore: true,
        validatorProxy: true,
        validatorSet: true,
        blockRewards: true
      },
      params: {
        validatorSet: {
          owner,
          initialValidators : [],
          superUser: owner
        },
        blockRewards: {
          owner,
          baseReward: '2000000000000000000',
          superUser: owner
        }
      }
    }));
    await addToWhitelist(owner, apollo, APOLLO, APOLLO_DEPOSIT);
    await addToWhitelist(owner, atlas1, ATLAS, ATLAS1_STAKE);
    await addToWhitelist(owner, atlas2, ATLAS, ATLAS2_STAKE);
    await addToWhitelist(owner, atlas3, ATLAS, ATLAS3_STAKE);
    await addToWhitelist(owner, hermes, HERMES, 0);
  });

  describe('canOnboard', () => {
    it('Atlas 1', async () => {
      expect(await canOnboardAsAtlas(atlas1, 0)).to.be.false;
      expect(await canOnboardAsAtlas(atlas1, ATLAS1_STAKE.sub(ONE))).to.be.false;
      expect(await canOnboardAsAtlas(atlas1, ATLAS1_STAKE)).to.be.true;
      expect(await canOnboardAsAtlas(atlas1, ATLAS1_STAKE.add(ONE))).to.be.false;
      expect(await canOnboardAsAtlas(atlas1, ATLAS2_STAKE)).to.be.false;
      expect(await canOnboardAsAtlas(atlas1, ATLAS3_STAKE)).to.be.false;
      expect(await canOnboardAsAtlas(hermes, ATLAS1_STAKE)).to.be.false;
    });

    it('Atlas 2', async () => {
      expect(await canOnboardAsAtlas(atlas2, ATLAS2_STAKE)).to.be.true;
      expect(await canOnboardAsAtlas(atlas2, ATLAS1_STAKE)).to.be.false;
      expect(await canOnboardAsAtlas(atlas2, ATLAS3_STAKE)).to.be.false;
    });

    it('Atlas 3', async () => {
      expect(await canOnboardAsAtlas(atlas3, ATLAS3_STAKE)).to.be.true;
      expect(await canOnboardAsAtlas(atlas3, ATLAS1_STAKE)).to.be.false;
      expect(await canOnboardAsAtlas(atlas3, ATLAS2_STAKE)).to.be.false;
    });

    it('Hermes', async () => {
      expect(await canOnboardAsHermes(hermes, 0)).to.be.true;
      expect(await canOnboardAsHermes(hermes, 1)).to.be.false;
      expect(await canOnboardAsHermes(apollo, 0)).to.be.false;
    });

    it('Apollo', async () => {
      expect(await canOnboardAsApollo(apollo, 0)).to.be.false;
      expect(await canOnboardAsApollo(apollo, APOLLO_DEPOSIT.sub(ONE))).to.be.false;
      expect(await canOnboardAsApollo(apollo, APOLLO_DEPOSIT)).to.be.true;
      expect(await canOnboardAsApollo(apollo, APOLLO_DEPOSIT.add(ONE))).to.be.false;
      expect(await canOnboardAsApollo(atlas1, APOLLO_DEPOSIT)).to.be.false;
    });
  });

  describe('Onboarding', () => {
    const url = 'https://google.com';

    describe('Atlas', () => {
      it('atlas 1', async () => {
        await expect(onboardAsAtlas(url, atlas1, ATLAS1_STAKE)).to.eventually.be.fulfilled;
        expect(await getStake(atlas1)).to.equal(ATLAS1_STAKE.toString());
        expect(await getUrl(atlas1)).to.equal(url);
        expect(await getRole(atlas1)).to.equal(ATLAS.toString());
      });

      it('atlas 2', async () => {
        await expect(onboardAsAtlas(url, atlas2, ATLAS2_STAKE)).to.eventually.be.fulfilled;
        expect(await getStake(atlas2)).to.equal(ATLAS2_STAKE.toString());
        expect(await getUrl(atlas2)).to.equal(url);
        expect(await getRole(atlas2)).to.equal(ATLAS.toString());
      });

      it('atlas 3', async () => {
        await expect(onboardAsAtlas(url, atlas3, ATLAS3_STAKE)).to.eventually.be.fulfilled;
        expect(await getStake(atlas3)).to.equal(ATLAS3_STAKE.toString());
        expect(await getUrl(atlas3)).to.equal(url);
        expect(await getRole(atlas3)).to.equal(ATLAS.toString());
      });

      it('throws if address has not been whitelisted for atlas role', async () => {
        await expect(onboardAsAtlas(url, apollo, ATLAS3_STAKE)).to.be.eventually.rejected;
        expect(await getRole(apollo)).to.equal('0');
      });

      it('throws if value sent does not equal the stake specified during kyc', async () => {
        await expect(onboardAsAtlas(url, atlas3, ATLAS3_STAKE.add(ONE))).to.be.eventually.rejected;
        expect(await getRole(atlas3)).to.equal('0');
      });
    });

    describe('Hermes', () => {
      it('works if preconditions are met', async () => {
        await expect(onboardAsHermes(url, hermes)).to.eventually.be.fulfilled;
        expect(await getStake(hermes)).to.equal('0');
        expect(await getUrl(hermes)).to.equal(url);
        expect(await getRole(hermes)).to.equal(HERMES.toString());
      });

      it('throws if address has not been whitelisted for hermes role', async () => {
        await expect(onboardAsHermes(url, atlas1)).to.be.eventually.rejected;
        expect(await getRole(atlas1)).to.equal('0');
      });
    });

    describe('Apollo', () => {
      it('stores the role and deposit', async () => {
        await expect(onboardAsApollo(apollo, APOLLO_DEPOSIT)).to.eventually.be.fulfilled;
        expect(await isDepositing(apollo)).to.be.true;
        expect(await getRole(apollo)).to.equal(APOLLO.toString());
      });

      it('adds node to validator set and block rewards', async () => {
        await expect(onboardAsApollo(apollo, APOLLO_DEPOSIT)).to.eventually.be.fulfilled;
        expect(await getValidators()).to.include(apollo);
        expect(await isBeneficiary(apollo)).to.be.true;
        expect(await beneficiaryShare(apollo)).to.equal(APOLLO_DEPOSIT.toString());
      });

      it('throws if address has not been whitelisted for apollo role', async () => {
        await expect(onboardAsApollo(atlas1, APOLLO_DEPOSIT)).to.be.eventually.rejected;
        expect(await getRole(atlas1)).to.equal('0');
      });

      it('throws if value sent does not equal the stake required during kyc', async () => {
        await expect(onboardAsApollo(apollo, APOLLO_DEPOSIT.sub(ONE))).to.be.eventually.rejected;
        await expect(onboardAsApollo(apollo, APOLLO_DEPOSIT.add(ONE))).to.be.eventually.rejected;
        expect(await getRole(apollo)).to.equal('0');
      });
    });
  });

  describe('Retiring', () => {
    const url = 'https://google.com';

    beforeEach(async () => {
      await onboardAsAtlas(url, atlas1, ATLAS1_STAKE);
      await onboardAsHermes(url, hermes);
      await onboardAsApollo(apollo, APOLLO_DEPOSIT);
    });

    describe('Atlas', () => {
      it('removes assigned role', async () => {
        await retireAtlas(atlas1);
        expect(await getRole(atlas1)).to.equal('0');
      });

      it('returns stake to the node', async () => {
        const balanceChange = await observeBalanceChange(web3, atlas1, () => retireAtlas(atlas1));
        expect(balanceChange.toString()).to.equal(ATLAS1_STAKE.toString());
      });

      it('throws if atlas is storing something', async () => {
        await atlasStakeStore.methods.incrementStorageUsed(atlas1).send({from: owner});
        await expect(retireAtlas(atlas1)).to.be.eventually.rejected;
      });

      it('throws if not an atlas', async () => {
        await expect(retireAtlas(hermes)).to.be.eventually.rejected;
        await expect(retireAtlas(apollo)).to.be.eventually.rejected;
      });
    });

    describe('Apollo', () => {
      it('removes assigned role', async () => {
        await retireApollo(apollo);
        expect(await getRole(apollo)).to.equal('0');
      });

      it('returns stake to the node', async () => {
        const balanceChange = await observeBalanceChange(web3, apollo, () => retireApollo(apollo));
        expect(balanceChange.toString()).to.equal(APOLLO_DEPOSIT.toString());
      });

      it('throws if not an apollo', async () => {
        await expect(retireApollo(hermes)).to.be.eventually.rejected;
        await expect(retireApollo(atlas1)).to.be.eventually.rejected;
      });
    });

    describe('Hermes', () => {
      it('removes assigned role', async () => {
        await retireHermes(hermes);
        expect(await getRole(hermes)).to.equal('0');
      });

      it('throws if not a hermes', async () => {
        await expect(retireHermes(atlas1)).to.be.eventually.rejected;
        await expect(retireHermes(apollo)).to.be.eventually.rejected;
      });
    });
  });

  describe('getStorageLimit', () => {
    it('Atlas 3', async () => {
      expect(await getStorageLimitForAtlas(ATLAS3_STAKE.add(ONE).toString())).to.eq('0');
      expect(await getStorageLimitForAtlas(ATLAS3_STAKE.sub(ONE).toString())).to.eq('0');
      expect(await getStorageLimitForAtlas(ATLAS3_STAKE.toString())).to.eq(ATLAS3_STORAGE_LIMIT.toString());
    });

    it('Atlas 2', async () => {
      expect(await getStorageLimitForAtlas(ATLAS3_STAKE.sub(ONE).toString())).to.eq('0');
      expect(await getStorageLimitForAtlas(ATLAS2_STAKE.add(ONE).toString())).to.eq('0');
      expect(await getStorageLimitForAtlas(ATLAS2_STAKE.toString())).to.eq(ATLAS2_STORAGE_LIMIT.toString());
    });

    it('Atlas 1', async () => {
      expect(await getStorageLimitForAtlas(ATLAS2_STAKE.sub(ONE).toString())).to.eq('0');
      expect(await getStorageLimitForAtlas(ATLAS1_STAKE.add(ONE).toString())).to.eq('0');
      expect(await getStorageLimitForAtlas(ATLAS1_STAKE.toString())).to.eq(ATLAS1_STORAGE_LIMIT.toString());
    });
  });
});
