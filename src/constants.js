/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {utils} from './utils/web3_tools';

export const MIN_BLOCK_TIME = 5;

export const NONE = '0';
export const ATLAS = '1';
export const HERMES = '2';
export const APOLLO = '3';
export const ROLE_CODES = {NONE, ATLAS, HERMES, APOLLO};
export const ROLE_REVERSE_CODES = {[NONE]: 'NONE', [ATLAS]: 'ATLAS', [HERMES]: 'HERMES', [APOLLO]: 'APOLLO'};

export const ATLAS1_STAKE = utils.toWei('10000');
export const ATLAS2_STAKE = utils.toWei('30000');
export const ATLAS3_STAKE = utils.toWei('75000');
export const APOLLO_DEPOSIT = utils.toWei('250000');
