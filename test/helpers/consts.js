
/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BN from 'bn.js';

export const ONE = new BN(1);
export const TWO = new BN(2);

export const DAY = 60 * 60 * 24;
export const STORAGE_PERIOD_UNIT = 364 * DAY;
export const PAYOUT_PERIOD_UNIT = 28 * DAY;

export const SYSTEM_CHALLENGES_COUNT = 7;

export const MAX_INTEGER = TWO.pow(new BN('256')).sub(ONE);
