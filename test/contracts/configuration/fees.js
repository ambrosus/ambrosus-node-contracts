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

chai.use(web3jsChai());

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Fees Contract - MOCK IMPLEMENTATION', () => {
  let fees;
  const startTime = 0;
  const endTime = 63072000;

  beforeEach(async () => {
    ({fees} = await deploy({contracts: {fees: true}}));
  });

  it('Returns non zero value if asked for challenge fee', async () => {
    expect(await fees.methods.getFeeForChallenge(startTime, endTime).call()).not.to.equal('0');
  });
});
