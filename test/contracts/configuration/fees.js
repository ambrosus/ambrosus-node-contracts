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
import {latestTime, day} from '../../helpers/web3_utils';

chai.use(web3jsChai());

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Fees Contract - MOCK IMPLEMENTATION', () => {
  let fees;
  let web3;
  let now;
  
  const startTime = 0;
  const endTime = 63072000;
  

  const getPenalty = async (nominalStake, panaltiesCount, lastPenaltyTime) => {
    const result = await fees.methods.getPenalty(nominalStake, panaltiesCount, lastPenaltyTime).call();
    return [result['0'], result['1']];
  };

  beforeEach(async () => {
    ({fees, web3} = await deploy({contracts: {fees: true}}));
    now = await latestTime(web3);
  });

  it('Returns non zero value if asked for challenge fee', async () => {
    expect(await fees.methods.getFeeForChallenge(startTime, endTime).call()).not.to.equal('0');
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
      const dayMinus89 = now - (90 * day);
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
      const dayMinus91 = now - (91 * day);
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
