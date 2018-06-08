/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export async function latestTime(web3) {
  return (await web3.eth.getBlock('latest')).timestamp;
}

export async function increaseTime (web3, duration) {
  const id = Date.now();
  if (duration.toNumber) {
    duration = duration.toNumber(); // eslint-disable-line no-param-reassign
  }

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration],
      id
    }, (err1) => {
      if (err1) {
        return reject(err1);
      }
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id + 1
      },
      // eslint-disable-next-line no-confusing-arrow
      (err2, res) => err2 ? reject(err2) : resolve(res));
    });
  });
}

export async function increaseTimeTo (web3, target) {
  const now = await latestTime(web3);
  if (target < now) {
    throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);
  }
  const diff = target - now;
  return await increaseTime(web3, diff);
}
