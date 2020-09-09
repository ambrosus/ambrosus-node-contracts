/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {expect} from 'chai';
import {convertRateToBaseReward, convertBaseRewardToRate} from '../../src/utils/block_reward_functions';

describe('Block Rewards Wrapper', () => {
  const resultsToInputs = [
    [0.01, '5731187175540674'],
    [0.03, '17193561526622022'],
    [0.05, '28655935877703370'],
    [0.1, '57311871755406741'],
    [0.3, '171935615266220225'],
    [0.5, '286559358777033709'],
    [1, '573118717554067418'],
    [1.01, '578849904729608092'],
    [1.3, '745054332820287643'],
    [2, '1146237435108134836'],
    [2.5, '1432796793885168546'],
    [3, '1719356152662202255'],
    [3.7, '2120539254950049448'],
    [5, '2865593587770337092']
  ];

  describe('Get correct reward value for the entered rate', () => {
    resultsToInputs.forEach(([rate, reward]) =>
      it(`correct reward for ${rate}`, async () => {
        expect(convertRateToBaseReward(rate)).to.equal(reward);
      }));
  });

  it ('Get correct reward value for extreme rate values', async () => {
    expect(convertRateToBaseReward(0)).to.equal('0');
    expect(convertRateToBaseReward(100)).to.equal('57311871755406741844');
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

  describe('Get correct rate calculated for reward value', () => {
    resultsToInputs.forEach(([rate, reward]) =>
      it(`correct rate for ${reward}`, async () => {
        expect(parseFloat(convertBaseRewardToRate(reward))).to.equal(rate);
      }));
  });

  it ('Roundtrip rate test', async () => {
    const defaultRate = (Math.random() * 100).toFixed(2);
    const reward = convertRateToBaseReward(defaultRate);
    const calculatedRate = convertBaseRewardToRate(reward);

    expect(calculatedRate).to.equal(defaultRate);
  });
  describe('Roundtrip rate test', () => {
    resultsToInputs.forEach(([rate]) =>
      it(`Passed for ${rate}`, async () => {
        const calculatedReward = convertRateToBaseReward(rate);
        const calculatedRate = convertBaseRewardToRate(calculatedReward);

        expect(parseFloat(calculatedRate)).to.equal(rate);
      }));
  });
});

