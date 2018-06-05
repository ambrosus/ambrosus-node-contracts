/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {createWeb3} from '../../../src/web3_tools';
import web3jsChai from '../../helpers/events';
import deployAll from '../../helpers/deployAll';
import BN from 'bn.js';
import utils from '../../helpers/utils';

chai.use(web3jsChai());

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

const ATLAS = 0;
const HERMES = 1;
const APOLLO = 2;

const ONE = new BN(1);

const ATLAS1_STAKE = utils.toWei(new BN(25000));
const ATLAS2_STAKE = utils.toWei(new BN(50000));
const ATLAS3_STAKE = utils.toWei(new BN(100000));
const HERMES_STAKE = utils.toWei(new BN(100000));
const APOLLO_STAKE = utils.toWei(new BN(1000000));

const HERMES_LIMIT = 100000;
const ATLAS1_LIMIT = 250000;
const ATLAS2_LIMIT = 750000;
const ATLAS3_LIMIT = 1750000;

describe('Roles Contract', () => {
  let web3;
  let roles;

  beforeEach(async () => {
    web3 = await createWeb3();    
    ({roles} = await deployAll(web3));
  });

  describe('canStake', () => {
    it('Atlas 1', async () => {      
      expect(await roles.methods.canStake(ATLAS, 0).call()).to.be.false;
      expect(await roles.methods.canStake(ATLAS, ATLAS1_STAKE.sub(ONE).toString()).call()).to.be.false;
      expect(await roles.methods.canStake(ATLAS, ATLAS1_STAKE.toString()).call()).to.be.true;
      expect(await roles.methods.canStake(ATLAS, ATLAS1_STAKE.add(ONE).toString()).call()).to.be.true;
    });

    it('Atlas 2', async () => {    
      expect(await roles.methods.canStake(ATLAS, ATLAS2_STAKE.toString()).call()).to.be.true;
      expect(await roles.methods.canStake(ATLAS, ATLAS2_STAKE.sub(ONE).toString()).call()).to.be.true;
      expect(await roles.methods.canStake(ATLAS, ATLAS2_STAKE.add(ONE).toString()).call()).to.be.true;    
    });

    it('Atlas 3', async () => {
      expect(await roles.methods.canStake(ATLAS, ATLAS3_STAKE.toString()).call()).to.be.true;
      expect(await roles.methods.canStake(ATLAS, ATLAS3_STAKE.sub(ONE).toString()).call()).to.be.true;
      expect(await roles.methods.canStake(ATLAS, ATLAS3_STAKE.add(ONE).toString()).call()).to.be.true;
    });

    it('Hermes', async () => {            
      expect(await roles.methods.canStake(HERMES, 0).call()).to.be.false;
      expect(await roles.methods.canStake(HERMES, HERMES_STAKE.sub(ONE).toString()).call()).to.be.false;
      expect(await roles.methods.canStake(HERMES, HERMES_STAKE.toString()).call()).to.be.true;
      expect(await roles.methods.canStake(HERMES, HERMES_STAKE.add(ONE).toString()).call()).to.be.true;
    });

    it('Apollo', async () => {
      expect(await roles.methods.canStake(APOLLO, 0).call()).to.be.false;      
      expect(await roles.methods.canStake(APOLLO, APOLLO_STAKE.sub(ONE).toString()).call()).to.be.false;
      expect(await roles.methods.canStake(APOLLO, APOLLO_STAKE.toString()).call()).to.be.true;      
      expect(await roles.methods.canStake(APOLLO, APOLLO_STAKE.add(ONE).toString()).call()).to.be.true;
    });
  });

  describe('getStorageLimit', () => {
    it('Atlas 3', async () => {
      expect(await roles.methods.getStorageLimit(ATLAS, ATLAS3_STAKE.add(ONE).toString()).call()).to.eq(ATLAS3_LIMIT.toString());
      expect(await roles.methods.getStorageLimit(ATLAS, ATLAS3_STAKE.toString()).call()).to.eq(ATLAS3_LIMIT.toString());
    });

    it('Atlas 2', async () => {
      expect(await roles.methods.getStorageLimit(ATLAS, ATLAS3_STAKE.sub(ONE).toString()).call()).to.eq(ATLAS2_LIMIT.toString());
      expect(await roles.methods.getStorageLimit(ATLAS, ATLAS2_STAKE.add(ONE).toString()).call()).to.eq(ATLAS2_LIMIT.toString());
      expect(await roles.methods.getStorageLimit(ATLAS, ATLAS2_STAKE.toString()).call()).to.eq(ATLAS2_LIMIT.toString());
    });

    it('Atlas 1', async () => {
      expect(await roles.methods.getStorageLimit(ATLAS, ATLAS2_STAKE.sub(ONE).toString()).call()).to.eq(ATLAS1_LIMIT.toString());
      expect(await roles.methods.getStorageLimit(ATLAS, ATLAS1_STAKE.add(ONE).toString()).call()).to.eq(ATLAS1_LIMIT.toString());
      expect(await roles.methods.getStorageLimit(ATLAS, ATLAS1_STAKE.toString()).call()).to.eq(ATLAS1_LIMIT.toString());
    });

    it('Hermes', async () => {
      expect(await roles.methods.getStorageLimit(HERMES, HERMES_STAKE.add(ONE).toString()).call()).to.eq(HERMES_LIMIT.toString());
      expect(await roles.methods.getStorageLimit(HERMES, HERMES_STAKE.toString()).call()).to.eq(HERMES_LIMIT.toString());
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
