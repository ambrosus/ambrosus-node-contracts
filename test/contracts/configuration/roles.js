/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import web3jsChai from '../../helpers/events';
import deploy from '../../helpers/deploy';
import {
  ONE,
  ATLAS,
  HERMES,
  APOLLO,
  ATLAS1_STAKE,
  ATLAS2_STAKE,
  ATLAS3_STAKE,
  HERMES_STAKE,
  APOLLO_STAKE,
  ATLAS1_STORAGE_LIMIT,
  ATLAS2_STORAGE_LIMIT,
  ATLAS3_STORAGE_LIMIT
} from '../../../src/consts';

chai.use(web3jsChai());

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;


describe('Roles Contract', () => {
  let roles;

  beforeEach(async () => {
    ({roles} = await deploy({roles: true}));
  });

  describe('canStake', () => {
    it('Atlas 1', async () => {
      expect(await roles.methods.canStake(ATLAS, 0).call()).to.be.false;
      expect(await roles.methods.canStake(ATLAS, ATLAS1_STAKE.sub(ONE).toString()).call()).to.be.false;
      expect(await roles.methods.canStake(ATLAS, ATLAS1_STAKE.toString()).call()).to.be.true;
      expect(await roles.methods.canStake(ATLAS, ATLAS1_STAKE.add(ONE).toString()).call()).to.be.false;
    });

    it('Atlas 2', async () => {
      expect(await roles.methods.canStake(ATLAS, ATLAS2_STAKE.toString()).call()).to.be.true;
      expect(await roles.methods.canStake(ATLAS, ATLAS2_STAKE.sub(ONE).toString()).call()).to.be.false;
      expect(await roles.methods.canStake(ATLAS, ATLAS2_STAKE.add(ONE).toString()).call()).to.be.false;
    });

    it('Atlas 3', async () => {
      expect(await roles.methods.canStake(ATLAS, ATLAS3_STAKE.toString()).call()).to.be.true;
      expect(await roles.methods.canStake(ATLAS, ATLAS3_STAKE.sub(ONE).toString()).call()).to.be.false;
      expect(await roles.methods.canStake(ATLAS, ATLAS3_STAKE.add(ONE).toString()).call()).to.be.false;
    });

    it('Hermes', async () => {
      expect(await roles.methods.canStake(HERMES, 0).call()).to.be.false;
      expect(await roles.methods.canStake(HERMES, HERMES_STAKE.sub(ONE).toString()).call()).to.be.false;
      expect(await roles.methods.canStake(HERMES, HERMES_STAKE.toString()).call()).to.be.true;
      expect(await roles.methods.canStake(HERMES, HERMES_STAKE.add(ONE).toString()).call()).to.be.false;
    });

    it('Apollo', async () => {
      expect(await roles.methods.canStake(APOLLO, 0).call()).to.be.false;
      expect(await roles.methods.canStake(APOLLO, APOLLO_STAKE.sub(ONE).toString()).call()).to.be.false;
      expect(await roles.methods.canStake(APOLLO, APOLLO_STAKE.toString()).call()).to.be.true;
      expect(await roles.methods.canStake(APOLLO, APOLLO_STAKE.add(ONE).toString()).call()).to.be.false;
    });
  });

  describe('getStorageLimit', () => {
    it('Atlas 3', async () => {
      expect(await roles.methods.getStorageLimit(ATLAS, ATLAS3_STAKE.add(ONE).toString()).call()).to.eq(ATLAS3_STORAGE_LIMIT.toString());
      expect(await roles.methods.getStorageLimit(ATLAS, ATLAS3_STAKE.toString()).call()).to.eq(ATLAS3_STORAGE_LIMIT.toString());
    });

    it('Atlas 2', async () => {
      expect(await roles.methods.getStorageLimit(ATLAS, ATLAS3_STAKE.sub(ONE).toString()).call()).to.eq(ATLAS2_STORAGE_LIMIT.toString());
      expect(await roles.methods.getStorageLimit(ATLAS, ATLAS2_STAKE.add(ONE).toString()).call()).to.eq(ATLAS2_STORAGE_LIMIT.toString());
      expect(await roles.methods.getStorageLimit(ATLAS, ATLAS2_STAKE.toString()).call()).to.eq(ATLAS2_STORAGE_LIMIT.toString());
    });

    it('Atlas 1', async () => {
      expect(await roles.methods.getStorageLimit(ATLAS, ATLAS2_STAKE.sub(ONE).toString()).call()).to.eq(ATLAS1_STORAGE_LIMIT.toString());
      expect(await roles.methods.getStorageLimit(ATLAS, ATLAS1_STAKE.add(ONE).toString()).call()).to.eq(ATLAS1_STORAGE_LIMIT.toString());
      expect(await roles.methods.getStorageLimit(ATLAS, ATLAS1_STAKE.toString()).call()).to.eq(ATLAS1_STORAGE_LIMIT.toString());
    });

    it('Hermes', async () => {
      expect(await roles.methods.getStorageLimit(HERMES, HERMES_STAKE.add(ONE).toString()).call()).to.eq('0');
      expect(await roles.methods.getStorageLimit(HERMES, HERMES_STAKE.toString()).call()).to.eq('0');
      expect(await roles.methods.getStorageLimit(HERMES, HERMES_STAKE.sub(ONE).toString()).call()).to.eq('0');
    });

    it('Apollo', async () => {
      expect(await roles.methods.getStorageLimit(APOLLO, HERMES_STAKE.toString()).call()).to.eq('0');
      expect(await roles.methods.getStorageLimit(APOLLO, APOLLO_STAKE.toString()).call()).to.eq('0');
      expect(await roles.methods.getStorageLimit(APOLLO, ATLAS1_STAKE.toString()).call()).to.eq('0');
      expect(await roles.methods.getStorageLimit(APOLLO, ATLAS2_STAKE.toString()).call()).to.eq('0');
      expect(await roles.methods.getStorageLimit(APOLLO, ATLAS3_STAKE.toString()).call()).to.eq('0');
    });
  });
});
