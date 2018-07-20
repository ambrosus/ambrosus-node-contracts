/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
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

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;


describe('Roles Contract', () => {
  let web3;
  let roles;
  let kycWhitelist;
  let atlasStakeStore;
  let apolloDepositStore;
  let rolesStore;
  let from;
  let apollo;
  let atlas;
  let hermes;

  const addToWhitelist = async (address, role) => kycWhitelist.methods.add(address, role).send({from});
  const onboardAsAtlas = async (url, sender, value) => roles.methods.onboardAsAtlas(url).send({from: sender, value});
  const onboardAsHermes = async (url, sender) => roles.methods.onboardAsHermes(url).send({from: sender});
  const onboardAsApollo = async (sender, value) => roles.methods.onboardAsApollo().send({from: sender, value});
  const canOnboardAsAtlas = async (address, value) => roles.methods.canOnboardAsAtlas(address, value).call();
  const canOnboardAsHermes = async (address) => roles.methods.canOnboardAsHermes(address).call();
  const canOnboardAsApollo = async (address, value) => roles.methods.canOnboardAsApollo(address, value).call();
  const getUrl = async (address) => rolesStore.methods.getUrl(address).call();
  const getRole = async (address) => rolesStore.methods.getRole(address).call();
  const getStorageLimitForAtlas = async (value) => roles.methods.getStorageLimitForAtlas(value).call();
  const getStake = async (address) => atlasStakeStore.methods.getStake(address).call();
  const isDepositing = async (address) => apolloDepositStore.methods.isDepositing(address).call();

  beforeEach(async () => {
    ({web3, roles, kycWhitelist, atlasStakeStore, rolesStore, apolloDepositStore} = await deploy({
      roles: true,
      kycWhitelist: true,
      atlasStakeStore: true,
      rolesStore: true,
      apolloDepositStore: true
    }));
    [from, apollo, atlas, hermes] = await web3.eth.getAccounts();
    await addToWhitelist(apollo, APOLLO);
    await addToWhitelist(atlas, ATLAS);
    await addToWhitelist(hermes, HERMES);
  });

  describe('canOnboard', () => {
    it('Atlas 1', async () => {
      expect(await canOnboardAsAtlas(atlas, 0)).to.be.false;
      expect(await canOnboardAsAtlas(atlas, ATLAS1_STAKE.sub(ONE))).to.be.false;
      expect(await canOnboardAsAtlas(atlas, ATLAS1_STAKE)).to.be.true;
      expect(await canOnboardAsAtlas(atlas, ATLAS1_STAKE.add(ONE))).to.be.false;
      expect(await canOnboardAsAtlas(hermes, ATLAS1_STAKE)).to.be.false;
    });

    it('Atlas 2', async () => {
      expect(await canOnboardAsAtlas(atlas, ATLAS2_STAKE)).to.be.true;
      expect(await canOnboardAsAtlas(atlas, ATLAS2_STAKE.sub(ONE))).to.be.false;
      expect(await canOnboardAsAtlas(atlas, ATLAS2_STAKE.add(ONE))).to.be.false;
    });

    it('Atlas 3', async () => {
      expect(await canOnboardAsAtlas(atlas, ATLAS3_STAKE)).to.be.true;
      expect(await canOnboardAsAtlas(atlas, ATLAS3_STAKE.sub(ONE))).to.be.false;
      expect(await canOnboardAsAtlas(atlas, ATLAS3_STAKE.add(ONE))).to.be.false;
    });

    it('Hermes', async () => {
      expect(await canOnboardAsHermes(hermes)).to.be.true;
      expect(await canOnboardAsHermes(apollo)).to.be.false;
    });

    it('Apollo', async () => {
      expect(await canOnboardAsApollo(apollo, 0)).to.be.false;
      expect(await canOnboardAsApollo(apollo, APOLLO_DEPOSIT.sub(ONE))).to.be.false;
      expect(await canOnboardAsApollo(apollo, APOLLO_DEPOSIT)).to.be.true;
      expect(await canOnboardAsApollo(apollo, APOLLO_DEPOSIT.add(ONE))).to.be.false;
      expect(await canOnboardAsApollo(atlas, APOLLO_DEPOSIT)).to.be.false;
    });
  });

  describe('Onboarding', () => {
    const url = 'https://google.com';

    describe('Atlas', () => {
      it('atlas 1', async () => {
        await onboardAsAtlas(url, atlas, ATLAS1_STAKE);
        expect(await getStake(atlas)).to.equal(ATLAS1_STAKE.toString());
        expect(await getUrl(atlas)).to.equal(url);
        expect(await getRole(atlas)).to.equal(ATLAS.toString());
      });

      it('atlas 2', async () => {
        await onboardAsAtlas(url, atlas, ATLAS2_STAKE);
        expect(await getStake(atlas)).to.equal(ATLAS2_STAKE.toString());
        expect(await getUrl(atlas)).to.equal(url);
        expect(await getRole(atlas)).to.equal(ATLAS.toString());
      });

      it('atlas 3', async () => {
        await onboardAsAtlas(url, atlas, ATLAS3_STAKE);
        expect(await getStake(atlas)).to.equal(ATLAS3_STAKE.toString());
        expect(await getUrl(atlas)).to.equal(url);
        expect(await getRole(atlas)).to.equal(ATLAS.toString());
      });

      it('throws if address has not been whitelisted for atlas role', async () => {
        await expect(onboardAsAtlas(url, apollo, ATLAS3_STAKE)).to.be.eventually.rejected;
        expect(await getRole(apollo)).to.equal('0');
      });

      it('throws if value sent does not equal any of atlas stakes', async () => {
        await expect(onboardAsAtlas(url, atlas, ATLAS3_STAKE.sub(ONE))).to.be.eventually.rejected;
        expect(await getRole(atlas)).to.equal('0');
      });
    });

    describe('Hermes', () => {
      it('hermes', async () => {
        await onboardAsHermes(url, hermes);
        expect(await getStake(hermes)).to.equal('0');
        expect(await getUrl(hermes)).to.equal(url);
        expect(await getRole(hermes)).to.equal(HERMES.toString());
      });

      it('throws if address has not been whitelisted for hermes role', async () => {
        await expect(onboardAsHermes(url, atlas)).to.be.eventually.rejected;
        expect(await getRole(atlas)).to.equal('0');
      });
    });

    describe('Apollo', () => {
      it('apollo', async () => {
        await onboardAsApollo(apollo, APOLLO_DEPOSIT);
        expect(await isDepositing(apollo)).to.be.true;
        expect(await getRole(apollo)).to.equal(APOLLO.toString());
      });

      it('throws if address has not been whitelisted for apollo role', async () => {
        await expect(onboardAsApollo(atlas, APOLLO_DEPOSIT)).to.be.eventually.rejected;
        expect(await getRole(atlas)).to.equal('0');
      });

      it('throws if value sent does not equal any of atlas stakes', async () => {
        await expect(onboardAsApollo(apollo, APOLLO_DEPOSIT.sub(ONE))).to.be.eventually.rejected;
        await expect(onboardAsApollo(apollo, APOLLO_DEPOSIT.add(ONE))).to.be.eventually.rejected;
        expect(await getRole(apollo)).to.equal('0');
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
