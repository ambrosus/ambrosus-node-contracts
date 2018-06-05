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

export const ATLAS1_STAKE = utils.toWei(new BN(25000));
export const ATLAS2_STAKE = utils.toWei(new BN(50000));
export const ATLAS3_STAKE = utils.toWei(new BN(100000));
export const HERMES_STAKE = utils.toWei(new BN(100000));
export const APOLLO_STAKE = utils.toWei(new BN(1000000));

export const HERMES_STORAGE_LIMIT = 100000;
export const ATLAS1_STORAGE_LIMIT = 250000;
export const ATLAS2_STORAGE_LIMIT = 750000;
export const ATLAS3_STORAGE_LIMIT = 1750000;

export const ONE = new BN(1);
