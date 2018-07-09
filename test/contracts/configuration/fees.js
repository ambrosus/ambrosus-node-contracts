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
import {DAY} from '../../../src/consts';
import {TWO} from '../../helpers/consts';
import TimeMockJson from '../../../build/contracts/TimeMock.json';
import BN from 'bn.js';

const {expect} = chai;

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Fees Contract', () => {
  let fees;
  let web3;
  const now = 1500000000;
  let time;
  let config;
  let basicFee;

  const getPenalty = async (nominalStake, penaltiesCount, lastPenaltyTime) => {
    const result = await fees.methods.getPenalty(nominalStake, penaltiesCount, lastPenaltyTime).call();
    return [result['0'], result['1']];
  };

  beforeEach(async () => {
    ({fees, web3, config, time} = await deploy({contracts: {fees: true, config: true, time: TimeMockJson}}));
    basicFee = await config.methods.BASIC_CHALLANGE_FEE().call();
  });

  it('Basic fee challenge to be positive', () => {
    expect(new BN(basicFee).gt(new BN(0))).to.be.true;
  });

  describe('Challenge fees', () => {
    it('Should throw if empty period', async () => {
      await expect(fees.methods.getFeeForChallenge(0).call()).to.be.eventually.rejected;
    });

    it('Returns proper fee for one storage period', async () => {
      const expected = (new BN(basicFee)).toString();
      expect(await fees.methods.getFeeForChallenge(1).call()).to.equal(expected);
    });

    it('Returns proper fee for two storage period', async () => {
      const expected = (new BN(basicFee)).mul(TWO);
      expect(await fees.methods.getFeeForChallenge(2).call()).to.equal(expected.toString());
    });
  });

  describe('Upload fees', () => {
    it('Should throw if empty period', async () => {
      await expect(fees.methods.getFeeForUpload(0).call()).to.be.eventually.rejected;
    });

    it('Calculate fee for one storage period', async () => {
      const fee = await fees.methods.getFeeForChallenge(1).call();
      const expected = (new BN(fee)).mul(new BN(10));
      expect(await fees.methods.getFeeForUpload(1).call()).not.to.equal(expected);
    });

    it('Calculate fee for two storage periods', async () => {
      const fee = await fees.methods.getFeeForChallenge(2).call();
      const expected = (new BN(fee)).mul(new BN(10));
      expect(await fees.methods.getFeeForUpload(2).call()).not.to.equal(expected);
    });
  });

  describe('Penalties', () => {
    beforeEach(async () => {
      await time.methods.setCurrentTimestamp(now).send({from: web3.eth.defaultAccount});
    });

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
