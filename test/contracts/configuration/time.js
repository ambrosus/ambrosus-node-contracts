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

const secondsInDay = 24 * 60 * 60;

describe('Time Contract', () => {
  let web3;
  let validUser;
  let time;

  const currentTimestamp = (senderAddress = validUser) => time.methods.currentTimestamp().call({from: senderAddress});
  const currentPayoutPeriod = (senderAddress = validUser) => time.methods.currentPayoutPeriod().call({from: senderAddress});
  const payoutPeriodForTimestamp = (timestamp, senderAddress = validUser) => time.methods.payoutPeriodForTimestamp(timestamp).call({from: senderAddress});
  const timestampForBeginOfPayoutPeriod = (period, senderAddress = validUser) => time.methods.timestampForBeginOfPayoutPeriod(period).call({from: senderAddress});
  const secondsSinceBeginOfPayoutPeriod = (timestamp, senderAddress = validUser) => time.methods.secondsSinceBeginOfPayoutPeriod(timestamp).call({from: senderAddress});

  beforeEach(async () => {
    ({web3, time} = await deploy({
      contracts: {
        time: true
      }
    }));
    [validUser] = await web3.eth.getAccounts();
  });

  it('Current timestamp proxies current block time', async () => {
    const web3block = await web3.eth.getBlock('latest');
    expect(await currentTimestamp()).to.equal(web3block.timestamp.toString());
  });

  it('Current Period uses the current block time', async () => {
    expect(await currentPayoutPeriod()).to.equal(await payoutPeriodForTimestamp(await currentTimestamp()));
  });

  it('Payout Period calculation returns the number of full 28 day periods since epoch', async () => {
    expect(await payoutPeriodForTimestamp(0)).to.equal('0');
    expect(await payoutPeriodForTimestamp(secondsInDay)).to.equal('0');
    expect(await payoutPeriodForTimestamp(27 * secondsInDay)).to.equal('0');
    expect(await payoutPeriodForTimestamp(28 * secondsInDay)).to.equal('1');
    expect(await payoutPeriodForTimestamp(45 * secondsInDay)).to.equal('1');
    expect(await payoutPeriodForTimestamp(57 * secondsInDay)).to.equal('2');
  });

  it('Timestamp For Begin Of Payout Period returns the timestamp of the first second in the provided period', async () => {
    expect(await timestampForBeginOfPayoutPeriod(0)).to.equal('0');
    expect(await timestampForBeginOfPayoutPeriod(50)).to.equal((50 * 28 * secondsInDay).toString());
  });

  it('Seconds Since Begin Of Payout Period returns the number of seconds since the begin of the provided period', async () => {
    const firstSecond = 50 * 28 * secondsInDay;
    expect(await secondsSinceBeginOfPayoutPeriod(firstSecond)).to.equal('0');
    expect(await secondsSinceBeginOfPayoutPeriod(firstSecond + 520)).to.equal('520');
  });
});
