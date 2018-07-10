/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/* eslint no-underscore-dangle: ["error", { "allow": ["_obj"] }] */
module.exports = function () {
  const emitEventMethod = function (eventName, params = {}) {
    const tx = this._obj;
    const eventOccurences = tx.events[eventName];
    this.assert(
      eventOccurences,
      `expected the tx to emit event: "${eventName}", but it was not emitted`,
      `expected the tx not to emit event: "${eventName}", but it was emitted one or more times`
    );
    if (params.times) {
      this.assert(
        (params.times === 1 && !eventOccurences.length) || params.times === eventOccurences.length,
        `expected the tx to emit event: "${eventName}", but it was not emitted`,
        `expected the tx not to emit event: "${eventName}", but it was emitted one or more times`
      );  
    }
  };

  const emitEventWithArgsMethod = function (eventName, args) {
    emitEventMethod.bind(this)(eventName, {times: 1});
    const tx = this._obj;
    const {returnValues} = tx.events[eventName];
    if (Array.isArray(args)) {
      const returnedArgs = Array.from(Array(args.length).keys()).map((index) => returnValues[index]);
      this.assert(
        args.length === returnedArgs.length && args.every((val,idx) => val === returnedArgs[idx]),
        `expected the tx to emit event with parameters [${args}], but instead it was emited with [${returnedArgs}]`,
        `expected the tx to emit event with parameters other then [${args}]`,
        args,
        returnedArgs
      );
    } else {
      const isEqual = Object.keys(args).every((key) => returnValues[key] === args[key]);
      this.assert(
        Object.keys(args).length * 2 === Object.keys(returnValues).length && isEqual,
        `expected the tx to emit event with parameters [${args}], but instead it was emitted with [${returnValues}]`,
        `expected the tx to emit event with parameters other then [${args}]`,
        args,
        returnValues
      );
    }
  };

  return function (chai) {
    chai.Assertion.addMethod('emitEvent', emitEventMethod);
    chai.Assertion.addMethod('emitEventWithArgs', emitEventWithArgsMethod);
  };
};
