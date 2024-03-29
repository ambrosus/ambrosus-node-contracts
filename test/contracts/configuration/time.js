/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import deploy from '../../helpers/deploy';
import {makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import {createWeb3Ganache} from '../../utils/web3_tools';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

const secondsInDay = 24 * 60 * 60;

describe('Time Contract', () => {
  let web3;
  let validUser;
  let time;
  let snapshotId;

  const currentTimestamp = (senderAddress = validUser) => time.methods.currentTimestamp().call({from: senderAddress});
  const currentPayoutPeriod = (senderAddress = validUser) => time.methods.currentPayoutPeriod().call({from: senderAddress});
  const payoutPeriod = (timestamp, senderAddress = validUser) => time.methods.payoutPeriod(timestamp).call({from: senderAddress});
  const payoutPeriodStart = (period, senderAddress = validUser) => time.methods.payoutPeriodStart(period).call({from: senderAddress});
  const payoutPeriodOffset = (timestamp, senderAddress = validUser) => time.methods.payoutPeriodOffset(timestamp).call({from: senderAddress});

  before(async () => {
    web3 = await createWeb3Ganache();
    [validUser] = await web3.eth.getAccounts();
    ({time} = await deploy({
      web3,
      contracts: {
        time: true
      }
    }));
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  it('Current timestamp proxies current block time', async () => {
    const web3block = await web3.eth.getBlock('latest');
    expect(await currentTimestamp()).to.equal(web3block.timestamp.toString());
  });

  it('Current Period uses the current block time', async () => {
    expect(await currentPayoutPeriod()).to.equal(await payoutPeriod(await currentTimestamp()));
  });

  it('Payout Period calculation returns the number of full 28 day periods since epoch', async () => {
    expect(await payoutPeriod(0)).to.equal('0');
    expect(await payoutPeriod(secondsInDay)).to.equal('0');
    expect(await payoutPeriod(27 * secondsInDay)).to.equal('0');
    expect(await payoutPeriod(28 * secondsInDay)).to.equal('1');
    expect(await payoutPeriod(45 * secondsInDay)).to.equal('1');
    expect(await payoutPeriod(57 * secondsInDay)).to.equal('2');
  });

  it('Timestamp For Begin Of Payout Period returns the timestamp of the first second in the provided period', async () => {
    expect(await payoutPeriodStart(0)).to.equal('0');
    expect(await payoutPeriodStart(50)).to.equal((50 * 28 * secondsInDay).toString());
  });

  it('Seconds Since Begin Of Payout Period returns the number of seconds since the begin of the provided period', async () => {
    const firstSecond = 50 * 28 * secondsInDay;
    expect(await payoutPeriodOffset(firstSecond)).to.equal('0');
    expect(await payoutPeriodOffset(firstSecond + 520)).to.equal('520');
  });
});
