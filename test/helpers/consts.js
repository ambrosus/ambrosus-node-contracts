
/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {utils} from '../../src/utils/web3_tools';
import BN from 'bn.js';

export const COINBASE = '0x0000000000000000000000000000000000000000';
export const BLOCK_REWARD = utils.toWei(new BN(3));

export const ONE = new BN(1);
export const TWO = new BN(2);

export const MAX_INTEGER = TWO.pow(new BN('256')).sub(ONE);
