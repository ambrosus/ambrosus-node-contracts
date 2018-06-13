/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {getDefaultAddress} from '../../src/web3_tools';

export const addToWhitelist = async (web3, context, addresses) => {
  await context.methods.addToWhitelist(addresses).send({from: getDefaultAddress(web3)});
};

export const removeFromWhitelist = async (web3, context, addresses) => {
  await context.methods.removeFromWhitelist(addresses).send({from: getDefaultAddress(web3)});
};
