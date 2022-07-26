/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import {createWeb3Ganache} from '../../utils/web3_tools';
import deploy from '../../helpers/deploy';
import {ONE} from '../../helpers/consts';
import {
  APOLLO,
  APOLLO_DEPOSIT,
  ATLAS,
  ATLAS1_STAKE,
  ATLAS2_STAKE,
  ATLAS3_STAKE,
  HERMES
} from '../../../src/constants';
import observeBalanceChange from '../../helpers/web3BalanceObserver';
import {expectEventEmission} from '../../helpers/web3EventObserver';
import BN from 'bn.js';

const APOLLO_DEPOSIT_BN = new BN(APOLLO_DEPOSIT);
const ATLAS1_STAKE_BN = new BN(ATLAS1_STAKE);
const ATLAS3_STAKE_BN = new BN(ATLAS3_STAKE);

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;


describe('Roles Contract', () => {
  let web3;
  let roles;
  let rolesEventEmitter;
  let kycWhitelist;
  let atlasStakeStore;
  let apolloDepositStore;
  let validatorSet;
  let blockRewards;
  let owner;
  let apollo;
  let apolloStake;
  let atlas1;
  let atlas2;
  let atlas3;
  let atlasStake;
  let hermes;
  let initialApollo;

  const addToWhitelist = async (sender, address, role, deposit) => kycWhitelist.methods.add(address, role, deposit).send({from: sender});
  const onboardAsAtlas = async (url, sender, value) => roles.methods.onboardAsAtlas(url).send({from: sender, value});
  const onboardAsAtlasSafe = async (address, url, sender, value) => roles.methods.onboardAsAtlasSafe(address, url).send({from: sender, value});
  const onboardAsHermes = async (url, sender) => roles.methods.onboardAsHermes(url).send({from: sender});
  const onboardAsApollo = async (sender, value) => roles.methods.onboardAsApollo().send({from: sender, value});
  const onboardAsApolloSafe = async (address, sender, value) => roles.methods.onboardAsApolloSafe(address).send({from: sender, value});
  const retireAtlas = async (sender) => roles.methods.retireAtlas().send({from: sender, gasPrice: '0'});
  const retireHermes = async (sender) => roles.methods.retireHermes().send({from: sender});
  const retireApollo = async (sender) => roles.methods.retireApollo().send({from: sender, gasPrice: '0'});
  const retireApolloByAddress = async (address, sender) => roles.methods.retireApollo(address).send({from: sender, gasPrice: '0'});
  const setUrl = async (sender, url) => roles.methods.setUrl(url).send({from: sender});
  const canOnboardAsAtlas = async (address, value) => roles.methods.canOnboard(address, ATLAS, value).call();
  const canOnboardAsHermes = async (address, value) => roles.methods.canOnboard(address, HERMES, value).call();
  const canOnboardAsApollo = async (address, value) => roles.methods.canOnboard(address, APOLLO, value).call();
  const getRole = async (address) => roles.methods.getOnboardedRole(address).call();
  const getUrl = async (address) => roles.methods.getUrl(address).call();
  const getStake = async (address) => atlasStakeStore.methods.getStake(address).call();
  const isDepositing = async (address) => apolloDepositStore.methods.isDepositing(address).call();
  const getValidators = async () => validatorSet.methods.getPendingValidators().call();
  const isBeneficiary = async (address) => blockRewards.methods.isBeneficiary(address).call();
  const beneficiaryShare = async (address) => blockRewards.methods.beneficiaryShare(address).call();

  let snapshotId;

  before(async () => {
    web3 = await createWeb3Ganache();
    [owner, apollo, apolloStake, initialApollo, atlas1, atlas2, atlas3, atlasStake, hermes] = await web3.eth.getAccounts();
    ({roles, kycWhitelist, atlasStakeStore, apolloDepositStore, validatorSet, blockRewards, rolesEventEmitter} = await deploy({
      web3,
      sender : owner,
      contracts: {
        roles: true,
        fees: true,
        time: true,
        config: true,
        kycWhitelist: true,
        kycWhitelistStore: true,
        atlasStakeStore: true,
        rolesStore: true,
        apolloDepositStore: true,
        validatorProxy: true,
        validatorSet: true,
        blockRewards: true,
        rolesEventEmitter: true,
        nodeAddressesStore: true
      },
      params: {
        validatorSet: {
          owner,
          initialValidators : [initialApollo],
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

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  describe('canOnboard', () => {
    it('Atlas 1', async () => {
      expect(await canOnboardAsAtlas(atlas1, 0)).to.be.false;
      expect(await canOnboardAsAtlas(atlas1, ATLAS1_STAKE_BN.sub(ONE).toString())).to.be.false;
      expect(await canOnboardAsAtlas(atlas1, ATLAS1_STAKE)).to.be.true;
      expect(await canOnboardAsAtlas(atlas1, ATLAS1_STAKE_BN.add(ONE).toString())).to.be.false;
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
      expect(await canOnboardAsApollo(apollo, APOLLO_DEPOSIT_BN.sub(ONE).toString())).to.be.false;
      expect(await canOnboardAsApollo(apollo, APOLLO_DEPOSIT_BN)).to.be.true;
      expect(await canOnboardAsApollo(apollo, APOLLO_DEPOSIT_BN.add(ONE).toString())).to.be.true;
      expect(await canOnboardAsApollo(atlas1, APOLLO_DEPOSIT_BN)).to.be.false;
    });
  });

  describe('Onboarding', () => {
    const url = 'https://google.com';

    describe('Atlas', () => {
      it('atlas 1', async () => {
        await expect(onboardAsAtlas(url, atlas1, ATLAS1_STAKE)).to.eventually.be.fulfilled;
        expect(await getStake(atlas1)).to.equal(ATLAS1_STAKE);
        expect(await getUrl(atlas1)).to.equal(url);
        expect(await getRole(atlas1)).to.equal(ATLAS.toString());
      });

      it('atlas 2', async () => {
        await expect(onboardAsAtlas(url, atlas2, ATLAS2_STAKE)).to.eventually.be.fulfilled;
        expect(await getStake(atlas2)).to.equal(ATLAS2_STAKE);
        expect(await getUrl(atlas2)).to.equal(url);
        expect(await getRole(atlas2)).to.equal(ATLAS.toString());
      });

      it('atlas 3', async () => {
        await expect(onboardAsAtlas(url, atlas3, ATLAS3_STAKE)).to.eventually.be.fulfilled;
        expect(await getStake(atlas3)).to.equal(ATLAS3_STAKE);
        expect(await getUrl(atlas3)).to.equal(url);
        expect(await getRole(atlas3)).to.equal(ATLAS.toString());
      });

      it('atlas safe', async () => {
        await expect(onboardAsAtlasSafe(atlas1, url, atlasStake, ATLAS1_STAKE)).to.eventually.be.fulfilled;
        expect(await getStake(atlasStake)).to.equal(ATLAS1_STAKE);
        expect(await getUrl(atlas1)).to.equal(url);
        expect(await getRole(atlas1)).to.equal(ATLAS.toString());
      });

      it('throws if address has not been whitelisted for atlas role', async () => {
        await expect(onboardAsAtlas(url, apollo, ATLAS3_STAKE)).to.be.eventually.rejected;
        expect(await getRole(apollo)).to.equal('0');
      });

      it('throws if value sent does not equal the stake specified during kyc', async () => {
        await expect(onboardAsAtlas(url, atlas3, ATLAS3_STAKE_BN.add(ONE))).to.be.eventually.rejected;
        expect(await getRole(atlas3)).to.equal('0');
      });

      it('emits proper event', async () => {
        await expectEventEmission(
          web3,
          () => onboardAsAtlas(url, atlas2, ATLAS2_STAKE),
          rolesEventEmitter,
          'NodeOnboarded',
          {
            nodeAddress: atlas2,
            placedDeposit: ATLAS2_STAKE,
            nodeUrl: url,
            role: ATLAS
          }
        );
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

      it('emits proper event', async () => {
        await expectEventEmission(
          web3,
          () => onboardAsHermes(url, hermes),
          rolesEventEmitter,
          'NodeOnboarded',
          {
            nodeAddress: hermes,
            placedDeposit: '0',
            nodeUrl: url,
            role: HERMES
          }
        );
      });
    });

    describe('Apollo', () => {
      it('stores the role and deposit', async () => {
        await expect(onboardAsApollo(apollo, APOLLO_DEPOSIT)).to.eventually.be.fulfilled;
        expect(await isDepositing(apollo)).to.be.true;
        expect(await getRole(apollo)).to.equal(APOLLO.toString());
      });

      it('stores the role and deposit safe', async () => {
        await expect(onboardAsApolloSafe(apollo, apolloStake, APOLLO_DEPOSIT)).to.eventually.be.fulfilled;
        expect(await isDepositing(apolloStake)).to.be.true;
        expect(await getRole(apollo)).to.equal(APOLLO.toString());
      });

      it('adds node to validator set and block rewards', async () => {
        await expect(onboardAsApollo(apollo, APOLLO_DEPOSIT)).to.eventually.be.fulfilled;
        expect(await getValidators()).to.include(apollo);
        expect(await isBeneficiary(apollo)).to.be.true;
        expect(await beneficiaryShare(apollo)).to.equal(APOLLO_DEPOSIT.toString());
      });

      it('allows to onboard with bigger stake', async () => {
        await expect(onboardAsApollo(apollo, APOLLO_DEPOSIT_BN.add(ONE))).to.eventually.be.fulfilled;
        expect(await getRole(apollo)).to.equal(APOLLO.toString());
        expect(await beneficiaryShare(apollo)).to.equal(APOLLO_DEPOSIT_BN.add(ONE).toString());
      });

      it('throws if address has not been whitelisted for apollo role', async () => {
        await expect(onboardAsApollo(atlas1, APOLLO_DEPOSIT)).to.be.eventually.rejected;
        expect(await getRole(atlas1)).to.equal('0');
      });

      it('throws if value sent is smaller than the stake required during kyc', async () => {
        await expect(onboardAsApollo(apollo, APOLLO_DEPOSIT_BN.sub(ONE))).to.be.eventually.rejected;
        expect(await getRole(apollo)).to.equal('0');
      });

      it('emits proper event', async () => {
        await expectEventEmission(
          web3,
          () => onboardAsApollo(apollo, APOLLO_DEPOSIT),
          rolesEventEmitter,
          'NodeOnboarded',
          {
            nodeAddress: apollo,
            placedDeposit: APOLLO_DEPOSIT,
            nodeUrl: '',
            role: APOLLO
          }
        );
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

      it('removes assigned url', async () => {
        await retireAtlas(atlas1);
        expect(await getUrl(atlas1)).to.equal('');
      });

      it('returns stake to the node', async () => {
        const balanceChange = await observeBalanceChange(web3, atlas1, () => retireAtlas(atlas1));
        expect(balanceChange.toString()).to.equal(ATLAS1_STAKE);
      });

      it('throws if atlas is storing something', async () => {
        await atlasStakeStore.methods.incrementShelteredBundlesCount(atlas1).send({from: owner});
        await expect(retireAtlas(atlas1)).to.be.eventually.rejected;
      });

      it('throws if not an atlas', async () => {
        await expect(retireAtlas(hermes)).to.be.eventually.rejected;
        await expect(retireAtlas(apollo)).to.be.eventually.rejected;
      });

      it('emits proper event', async () => {
        await expectEventEmission(
          web3,
          () => retireAtlas(atlas1),
          rolesEventEmitter,
          'NodeRetired',
          {
            nodeAddress: atlas1,
            releasedDeposit: ATLAS1_STAKE,
            role: ATLAS
          }
        );
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

      it('removes node from validator set and block rewards', async () => {
        await retireApollo(apollo);
        expect(await getValidators()).to.not.include(apollo);
        expect(await isBeneficiary(apollo)).to.be.false;
        expect(await beneficiaryShare(apollo)).to.equal('0');
      });

      it('throws if not an apollo', async () => {
        await expect(retireApollo(hermes)).to.be.eventually.rejected;
        await expect(retireApollo(atlas1)).to.be.eventually.rejected;
      });

      it('emits proper event', async () => {
        await expectEventEmission(
          web3,
          () => retireApollo(apollo),
          rolesEventEmitter,
          'NodeRetired',
          {
            nodeAddress: apollo,
            releasedDeposit: APOLLO_DEPOSIT,
            role: APOLLO
          }
        );
      });

      it('retire Apollo by address', async () => {
        await retireApolloByAddress(apollo, owner);
        expect(await getRole(apollo)).to.equal('0');
      });

      it('throw if not owner retire Apollo by address', async () => {
        await expect(retireApolloByAddress(apollo, apollo)).to.be.eventually.rejected;
      });
    });

    describe('Hermes', () => {
      it('removes assigned role', async () => {
        await retireHermes(hermes);
        expect(await getRole(hermes)).to.equal('0');
      });

      it('removes assigned url', async () => {
        await retireHermes(hermes);
        expect(await getUrl(hermes)).to.equal('');
      });

      it('throws if not a hermes', async () => {
        await expect(retireHermes(atlas1)).to.be.eventually.rejected;
        await expect(retireHermes(apollo)).to.be.eventually.rejected;
      });

      it('emits proper event', async () => {
        await expectEventEmission(
          web3,
          () => retireHermes(hermes),
          rolesEventEmitter,
          'NodeRetired',
          {
            nodeAddress: hermes,
            releasedDeposit: '0',
            role: HERMES
          }
        );
      });
    });
  });

  describe('setUrl', () => {
    const oldUrl = 'https://google.com';
    const newUrl = 'https://yahoo.com';

    it('correctly sets new URL', async () => {
      await onboardAsAtlas(oldUrl, atlas1, ATLAS1_STAKE);
      expect(await getUrl(atlas1)).to.equal(oldUrl);
      await setUrl(atlas1, newUrl);
      expect(await getUrl(atlas1)).to.equal(newUrl);
    });

    it('allows Atlas to set Url', async () => {
      onboardAsAtlas(oldUrl, atlas1, ATLAS1_STAKE);
      await expect(setUrl(atlas1, newUrl)).to.be.eventually.fulfilled;
    });

    it('allows Hermes to set Url', async () => {
      onboardAsHermes(oldUrl, hermes);
      await expect(setUrl(hermes, newUrl)).to.be.eventually.fulfilled;
    });

    it('does not allow Apollo to set Url', async () => {
      onboardAsApollo(apollo, APOLLO_DEPOSIT);
      await expect(setUrl(apollo, newUrl)).to.be.eventually.rejected;
    });

    it('does not allow unonboarded address to set Url', async () => {
      await expect(setUrl(atlas1, newUrl)).to.be.eventually.rejected;
    });

    it('emits proper event', async () => {
      onboardAsAtlas(oldUrl, atlas1, ATLAS1_STAKE);
      await expectEventEmission(
        web3,
        () => setUrl(atlas1, newUrl),
        rolesEventEmitter,
        'NodeUrlChanged',
        {
          nodeAddress: atlas1,
          oldNodeUrl: oldUrl,
          newNodeUrl: newUrl
        }
      );
    });
  });
});
