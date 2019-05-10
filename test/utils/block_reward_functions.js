/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {convertRateToBaseReward, convertBaseRewardToRate} from '../../src/utils/block_reward_functions';

chai.use(chaiAsPromised);
chai.use(require('sinon-chai'));

describe('Block Rewards Wrapper', () => {
  const resultsToInputs = {
    0: '0',
    0.01: '5731187175540674',
    0.03: '17193561526622022',
    0.05: '28655935877703370',
    0.1: '57311871755406741',
    0.3: '171935615266220225',
    0.5: '286559358777033709',
    1: '573118717554067418',
    1.01: '578849904729608092',
    1.3: '745054332820287643',
    2: '1146237435108134836',
    2.5: '1432796793885168546',
    3: '1719356152662202255',
    5: '2865593587770337092',
    100: '57311871755406741844'
  };

  it('Get correct reward value for the entered rate', async () => {
    expect(convertRateToBaseReward(0.01)).to.equal(resultsToInputs[0.01]);
    expect(convertRateToBaseReward(0.03)).to.equal(resultsToInputs[0.03]);
    expect(convertRateToBaseReward(0.05)).to.equal(resultsToInputs[0.05]);
    expect(convertRateToBaseReward(0.1)).to.equal(resultsToInputs[0.1]);
    expect(convertRateToBaseReward(0.3)).to.equal(resultsToInputs[0.3]);
    expect(convertRateToBaseReward(0.5)).to.equal(resultsToInputs[0.5]);
    expect(convertRateToBaseReward(1)).to.equal(resultsToInputs[1]);
    expect(convertRateToBaseReward(1.01)).to.equal(resultsToInputs[1.01]);
    expect(convertRateToBaseReward(1.3)).to.equal(resultsToInputs[1.3]);
    expect(convertRateToBaseReward(2)).to.equal(resultsToInputs[2]);
    expect(convertRateToBaseReward(2.5)).to.equal(resultsToInputs[2.5]);
    expect(convertRateToBaseReward(3)).to.equal(resultsToInputs[3]);
    expect(convertRateToBaseReward(5)).to.equal(resultsToInputs[5]);
  });

  it ('Get correct reward value for extreme rate values', async () => {
    expect(convertRateToBaseReward(0)).to.equal(resultsToInputs[0]);
    expect(convertRateToBaseReward(100)).to.equal(resultsToInputs[100]);
  });

  it('Get exception for the rate more than 100%', async () => {
    expect(() => {
      convertRateToBaseReward(101);
    }).to.throw('Invalid rate');
  });

  it('Get exception for the negative rate', async () => {
    expect(() => {
      convertRateToBaseReward(-2);
    }).to.throw('Invalid rate');
  });

  it('Get correct rate calculated for reward value', async () => {
    expect(parseFloat(convertBaseRewardToRate(resultsToInputs[0.01]))).to.equal(0.01);
    expect(parseFloat(convertBaseRewardToRate(resultsToInputs[0.03]))).to.equal(0.03);
    expect(parseFloat(convertBaseRewardToRate(resultsToInputs[0.05]))).to.equal(0.05);
    expect(parseFloat(convertBaseRewardToRate(resultsToInputs[0.1]))).to.equal(0.1);
    expect(parseFloat(convertBaseRewardToRate(resultsToInputs[0.3]))).to.equal(0.3);
    expect(parseFloat(convertBaseRewardToRate(resultsToInputs[0.5]))).to.equal(0.5);
    expect(parseFloat(convertBaseRewardToRate(resultsToInputs[1]))).to.equal(1);
    expect(parseFloat(convertBaseRewardToRate(resultsToInputs[1.01]))).to.equal(1.01);
    expect(parseFloat(convertBaseRewardToRate(resultsToInputs[1.3]))).to.equal(1.3);
    expect(parseFloat(convertBaseRewardToRate(resultsToInputs[2]))).to.equal(2);
    expect(parseFloat(convertBaseRewardToRate(resultsToInputs[2.5]))).to.equal(2.5);
    expect(parseFloat(convertBaseRewardToRate(resultsToInputs[3]))).to.equal(3);
    expect(parseFloat(convertBaseRewardToRate(resultsToInputs[5]))).to.equal(5);
  });

  it ('Roundtrip rate test', async () => {
    const defaultRate = (Math.random() * 100).toFixed(2);
    const reward = convertRateToBaseReward(defaultRate);
    const calculatedRate = convertBaseRewardToRate(reward);

    expect(calculatedRate).to.equal(defaultRate);
  });
});

