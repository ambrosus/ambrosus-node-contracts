/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';

const {expect} = chai;

const captureEventEmission = async (web3, codeBlock, contract, eventName) => {
  const fromBlock = await web3.eth.getBlockNumber();
  await codeBlock();
  const toBlock = await web3.eth.getBlockNumber();
  return contract.getPastEvents(eventName, {fromBlock, toBlock});
};

const expectEventEmission = async (web3, codeBlock, contract, eventName, eventArguments) => {
  const events = await captureEventEmission(web3, codeBlock, contract, eventName);
  expect(events.length).to.equal(1);
  Object.keys(eventArguments).forEach((eventArgumentName) => {
    expect(events[0].returnValues[eventArgumentName]).to.equal(eventArguments[eventArgumentName]);
  });
};

export {captureEventEmission, expectEventEmission};
