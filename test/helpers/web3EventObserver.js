/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const observeEventEmission = async (web3, codeBlock, contract, eventName) => {
  const fromBlock = await web3.eth.getBlockNumber();
  await codeBlock();
  const toBlock = await web3.eth.getBlockNumber();
  return contract.getPastEvents(eventName, {fromBlock, toBlock});
};

export default observeEventEmission;
