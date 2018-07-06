/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const chaiEmitEvents = (chai, utils) => {
  utils.addMethod(chai.Assertion.prototype, 'emitEvent', function (eventName) {
    const tx = utils.flag(this, 'object');
    const eventOccurrences = tx.events[eventName];
    this.assert(
      eventOccurrences,
      `expected the tx to emit event: "${eventName}", but it was not emitted`,
      `expected the tx not to emit event: "${eventName}", but it was emitted one or more times`
    );
  });
};

export default chaiEmitEvents;
