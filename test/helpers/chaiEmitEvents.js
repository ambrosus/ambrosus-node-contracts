/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/* eslint no-underscore-dangle: ["error", { "allow": ["_obj"] }] */
module.exports = function (chai, utils) {
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
    utils.flag(this, 'events', Array.isArray(tx.events[eventName]) ? tx.events[eventName] : [tx.events[eventName]]);
    utils.flag(this, 'eventName', eventName);
  };

  const compareArgsAsArray = function (args, returnValues) {
    const eventArgsToArray = (returnValues) => Array.from(Array(args.length).keys()).map((index) => returnValues[index]);
    const returnedArgs = eventArgsToArray(returnValues);
    const isEqual = args.every((val, index) => val === returnedArgs[index]);
    this.assert(
      returnedArgs[args.length] === undefined && isEqual,
      `expected the tx to emit event with parameters [${args}], but instead it was emitted with [${returnedArgs}]`,
      `expected the tx to emit event with parameters other then [${args}]`,
      args,
      returnedArgs
    );
  };

  const compareArgsAsDict = function (args, returnValues) {
    const eventArgsToDict = (returnValues) => {
      const argCount = Object.keys(returnValues).length / 2;
      const result = {...returnValues};
      for (let index = 0; index < argCount; index++) {
        delete result[index];
      }
      return result;
    };

    const withoutPositionalArgs = eventArgsToDict(returnValues);
    const isEqual = Object.keys(args).every((key) => returnValues[key] === args[key]);
    this.assert(
      Object.keys(args).length === Object.keys(withoutPositionalArgs).length && isEqual,
      `expected the tx to emit event with parameters [${args}], but instead it was emitted with [${withoutPositionalArgs}]`,
      `expected the tx to emit event with parameters other then [${args}]`,
      args,
      withoutPositionalArgs
    );
  };

  const withArgs = function (args) {
    const events = utils.flag(this, 'events');
    const eventName = utils.flag(this, 'eventName');
    if (!events) {
      throw new Error('Should be called after `emitEvent`');
    }
    if (events.length !== 1) {
      throw new Error(`withArgs works only when one ${eventName} was emitted. Instead found ${events.length}. Consider calling alwaysWithArgs`);
    }
    const [{returnValues}] = events;
    if (Array.isArray(args)) {
      compareArgsAsArray.bind(this)(args, returnValues);
    } else {
      compareArgsAsDict.bind(this)(args, returnValues);
    }
  };

  const alwaysWithArgs = function (args) {
    const events = utils.flag(this, 'events');
    if (!events) {
      throw new Error('Should be called after `emitEvent`');
    }

    if (Array.isArray(args)) {
      events.forEach((eventEmition) => compareArgsAsArray.bind(this)(args, eventEmition.returnValues));
    } else {
      events.forEach((eventEmition) => compareArgsAsDict.bind(this)(args, eventEmition.returnValues));
    }
  };

  chai.Assertion.addChainableMethod('emitEvent', emitEventMethod);
  chai.Assertion.addMethod('withArgs', withArgs);
  chai.Assertion.addMethod('emitEvent', alwaysWithArgs);
};
