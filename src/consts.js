/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import utils from '../test/helpers/utils';
import BN from 'bn.js';

export const ATLAS = 0;
export const HERMES = 1;
export const APOLLO = 2;

export const ATLAS1_STAKE = utils.toWei(new BN(10000));
export const ATLAS2_STAKE = utils.toWei(new BN(30000));
export const ATLAS3_STAKE = utils.toWei(new BN(75000));
export const HERMES_STAKE = utils.toWei(new BN(150000));
export const APOLLO_STAKE = utils.toWei(new BN(250000));

export const ATLAS1_STORAGE_LIMIT = 100000;
export const ATLAS2_STORAGE_LIMIT = 400000;
export const ATLAS3_STORAGE_LIMIT = 1000000;

export const PAYOUT_PERIOD_IN_SECONDS = 28 * 24 * 60 * 60;

export const ONE = new BN(1);
export const DAY = 60 * 60 * 24;

export const STORAGE_PERIOD_UNIT = 364 * DAY;

export const SYSTEM_CHALLENGES_COUNT = 5;
