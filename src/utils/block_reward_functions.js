/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BigNumber from 'bignumber.js';
import {TOTAL_AMB_SUPPLY, BLOCKS_PER_YEAR} from '../constants';

BigNumber.config({EXPONENTIAL_AT: 1e+9});


export function convertRateToBaseReward(rate) {
  if (rate < 0 || rate > 100) {
    throw 'Invalid rate';
  }
  BigNumber.set({ROUNDING_MODE: BigNumber.ROUND_DOWN});

  const totalSupply = new BigNumber(TOTAL_AMB_SUPPLY);
  const numberOfBlocksInYear = new BigNumber(BLOCKS_PER_YEAR);

  const baseReward = totalSupply.dividedBy(numberOfBlocksInYear).multipliedBy(rate)
    .dividedBy(100);

  return baseReward.toFixed(0);
}

export function convertBaseRewardToRate(baseReward) {
  const baseRewordBN = new BigNumber(baseReward);
  const totalSupply = new BigNumber(TOTAL_AMB_SUPPLY);
  const numberOfBlocksInYear = new BigNumber(BLOCKS_PER_YEAR);

  BigNumber.set({ROUNDING_MODE: BigNumber.ROUND_HALF_UP});
  const rate = baseRewordBN.multipliedBy(numberOfBlocksInYear).multipliedBy(100)
    .dividedBy(totalSupply);

  return rate.toFixed(2);
}

