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
    const eventArgsToArray = (returnValues) => Array.from(Array(args.length).keys()).map((index) => returnValues[index]);
    const eventArgsToDict = (returnValues) => {
      const argCount = Object.keys(returnValues).length / 2;
      const result = {...returnValues};
      for (let index = 0; index < argCount; index++) {
        delete result[index];
      }
      return result;
    };

    emitEventMethod.bind(this)(eventName, {times: 1});
    const tx = this._obj;
    const {returnValues} = tx.events[eventName];
    if (Array.isArray(args)) {
      const returnedArgs = eventArgsToArray(returnValues);
      const isEqual = args.every((val, index) => val === returnedArgs[index]);
      this.assert(
        returnedArgs[args.length] === undefined && isEqual,
        `expected the tx to emit event with parameters [${args}], but instead it was emitted with [${returnedArgs}]`,
        `expected the tx to emit event with parameters other then [${args}]`,
        args,
        returnedArgs
      );
    } else {
      const withoutPositionalArgs = eventArgsToDict(returnValues);
      const isEqual = Object.keys(args).every((key) => returnValues[key] === args[key]);
      this.assert(
        Object.keys(args).length === Object.keys(withoutPositionalArgs).length && isEqual,
        `expected the tx to emit event with parameters [${args}], but instead it was emitted with [${withoutPositionalArgs}]`,
        `expected the tx to emit event with parameters other then [${args}]`,
        args,
        withoutPositionalArgs
      );
    }
  };

  return function (chai) {
    chai.Assertion.addMethod('emitEvent', emitEventMethod);
    chai.Assertion.addMethod('emitEventWithArgs', emitEventWithArgsMethod);
  };
};
