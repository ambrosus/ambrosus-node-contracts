/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class NodeServiceActions {
  constructor(rolesWrapper) {
    this.rolesWrapper = rolesWrapper;
  }

  async setNodeUrl(address, url) {
    const roles = this.rolesWrapper;

    if (address !== roles.defaultAddress) {
      throw new Error('You can only change your own url');
    }

    await roles.setNodeUrl(address, url);
  }
}
