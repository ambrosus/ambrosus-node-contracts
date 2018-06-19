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
import {latestTime} from '../../helpers/web3_utils';

chai.use(web3jsChai());

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Fees Contract - MOCK IMPLEMENTATION', () => {
  let fees;
  let web3;
  const startTime = 0;
  const endTime = 63072000;

  beforeEach(async () => {
    ({fees, web3} = await deploy({contracts: {fees: true}}));
  });

  it('Returns non zero value if asked for challenge fee', async () => {
    expect(await fees.methods.getFeeForChallenge(startTime, endTime).call()).not.to.equal('0');
  });

  describe('Penalties', () => {
    it('First penalty should equal 1% of nominal stake', async () => {
      expect(await fees.methods.getPenalty(10000, 0, 0).call()).to.equal('100');
    });

    it('Each subsequent penalty should double', async () => {
      const now = await latestTime(web3);
      expect(await fees.methods.getPenalty(10000, 0, now).call()).to.equal('100');
      expect(await fees.methods.getPenalty(10000, 1, now).call()).to.equal('200');
      expect(await fees.methods.getPenalty(10000, 2, now).call()).to.equal('400');
      expect(await fees.methods.getPenalty(10000, 3, now).call()).to.equal('800');
      expect(await fees.methods.getPenalty(10000, 4, now).call()).to.equal('1600');
      expect(await fees.methods.getPenalty(10000, 5, now).call()).to.equal('3200');
      expect(await fees.methods.getPenalty(10000, 6, now).call()).to.equal('6400');      
      expect(await fees.methods.getPenalty(10000, 7, now).call()).to.equal('12800');      
    });

    it('Penalty doublation should expire after 90 days', async () => {
      expect(await fees.methods.getPenalty(10000, 0, 0).call()).to.equal('100');
      expect(await fees.methods.getPenalty(10000, 1, 0).call()).to.equal('100');
      expect(await fees.methods.getPenalty(10000, 2, 0).call()).to.equal('100');
      expect(await fees.methods.getPenalty(10000, 3, 0).call()).to.equal('100');
      expect(await fees.methods.getPenalty(10000, 4, 0).call()).to.equal('100');
      expect(await fees.methods.getPenalty(10000, 5, 0).call()).to.equal('100');
      expect(await fees.methods.getPenalty(10000, 6, 0).call()).to.equal('100');      
      expect(await fees.methods.getPenalty(10000, 7, 0).call()).to.equal('100');      
    });    
  });
});
