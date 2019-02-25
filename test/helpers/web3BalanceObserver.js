/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BN from 'bn.js';

const observeBalanceChange = async (web3, account, codeBlock) => {
  const balanceBefore = new BN(await web3.eth.getBalance(account));
  await codeBlock();
  const balanceAfter = new BN(await web3.eth.getBalance(account));
  return balanceAfter.sub(balanceBefore);
};

export default observeBalanceChange;
