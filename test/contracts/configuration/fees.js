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
import {DAY, STORAGE_PERIOD_UNIT} from '../../../src/consts';
import {TWO} from '../../helpers/consts';

import {latestTime} from '../../helpers/web3_utils';
import BN from 'bn.js';

const {expect} = chai;

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Fees Contract', () => {
  let fees;
  let web3;
  let now;
  let config;
  let basicFee;
  
  const startTime = 0;
  const endTime = 2 * STORAGE_PERIOD_UNIT;

  const getPenalty = async (nominalStake, penaltiesCount, lastPenaltyTime) => {
    const result = await fees.methods.getPenalty(nominalStake, penaltiesCount, lastPenaltyTime).call();
    return [result['0'], result['1']];
  };

  beforeEach(async () => {
    ({fees, web3, config} = await deploy({contracts: {fees: true, config: true}}));    
    basicFee = await config.methods.BASIC_CHALLANGE_FEE().call();
    now = await latestTime(web3);
  });

  it('Basic fee challenge to be positive', () => {
    expect(new BN(basicFee).gt(new BN(0))).to.be.true;
  });

  describe('Challenge fees', () => {
    it('Should throw if empty period', async () => {
      await expect(fees.methods.getFeeForChallenge(0, 0).call()).to.be.eventually.rejected;
    });

    it('Should throw if interval below storage period unit', async () => {
      await expect(fees.methods.getFeeForChallenge(0, STORAGE_PERIOD_UNIT / 2).call()).to.be.eventually.rejected;
    });

    it('Should throw if interval between storage peroid units', async () => {
      await expect(fees.methods.getFeeForChallenge(0, STORAGE_PERIOD_UNIT * 3 / 2).call()).to.be.eventually.rejected;
    });

    it('Should throw if negative period', async () => {
      await expect(fees.methods.getFeeForChallenge(0, -STORAGE_PERIOD_UNIT).call()).to.be.eventually.rejected;
    });
    
    it('Returns proper fee for one storage period', async () => {
      const expected = (new BN(basicFee)).toString();
      expect(await fees.methods.getFeeForChallenge(startTime, STORAGE_PERIOD_UNIT).call()).to.equal(expected);
    });

    it('Returns proper fee for two storage period', async () => {
      const expected = (new BN(basicFee)).mul(TWO);
      expect(await fees.methods.getFeeForChallenge(startTime, endTime).call()).to.equal(expected.toString());
    });
  });

  describe('Upload fees', () => {
    it('Should throw if empty period', async () => {
      await expect(fees.methods.getFeeForUpload(0).call()).to.be.eventually.rejected;
    });

    it('Calculate fee for one storage period', async () => {
      const fee = await fees.methods.getFeeForChallenge(startTime, STORAGE_PERIOD_UNIT).call();
      const expected = (new BN(fee)).mul(new BN(10));
      expect(await fees.methods.getFeeForUpload(1).call()).not.to.equal(expected);
    });

    it('Calculate fee for two storage periods', async () => {
      const fee = await fees.methods.getFeeForChallenge(startTime, endTime).call();
      const expected = (new BN(fee)).mul(new BN(10));
      expect(await fees.methods.getFeeForUpload(2).call()).not.to.equal(expected);
    });
  });

  describe('Penalties', () => {
    it('First penalty should equal 1% of nominal stake', async () => {
      expect(await getPenalty(10000, 0, 0)).to.deep.equal(['100', '1']);
    });

    it('Each subsequent penalty should double', async () => {      
      expect(await getPenalty(10000, 0, now)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 1, now)).to.deep.equal(['200', '2']);
      expect(await getPenalty(10000, 2, now)).to.deep.equal(['400', '3']);
      expect(await getPenalty(10000, 3, now)).to.deep.equal(['800', '4']);
      expect(await getPenalty(10000, 4, now)).to.deep.equal(['1600', '5']);
      expect(await getPenalty(10000, 5, now)).to.deep.equal(['3200', '6']);
      expect(await getPenalty(10000, 6, now)).to.deep.equal(['6400', '7']);      
      expect(await getPenalty(10000, 7, now)).to.deep.equal(['12800', '8']);      
    });

    it('Each subsequent penalty should double up until 90 days', async () => {      
      const dayMinus89 = now - (89 * DAY);
      expect(await getPenalty(10000, 0, dayMinus89)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 1, dayMinus89)).to.deep.equal(['200', '2']);
      expect(await getPenalty(10000, 2, dayMinus89)).to.deep.equal(['400', '3']);
      expect(await getPenalty(10000, 3, dayMinus89)).to.deep.equal(['800', '4']);
      expect(await getPenalty(10000, 4, dayMinus89)).to.deep.equal(['1600', '5']);
      expect(await getPenalty(10000, 5, dayMinus89)).to.deep.equal(['3200', '6']);
      expect(await getPenalty(10000, 6, dayMinus89)).to.deep.equal(['6400', '7']);      
      expect(await getPenalty(10000, 7, dayMinus89)).to.deep.equal(['12800', '8']);      
    });

    it('Penalty doublation should expire after 90 days', async () => {
      const dayMinus91 = now - (91 * DAY);
      expect(await getPenalty(10000, 0, dayMinus91)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 1, dayMinus91)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 2, dayMinus91)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 3, dayMinus91)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 4, dayMinus91)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 5, dayMinus91)).to.deep.equal(['100', '1']);
      expect(await getPenalty(10000, 6, dayMinus91)).to.deep.equal(['100', '1']);      
      expect(await getPenalty(10000, 7, dayMinus91)).to.deep.equal(['100', '1']);      
    });    
  });
});
