/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


export default class FeesActions {
  constructor(feesWrapper) {
    this.feesWrapper = feesWrapper;
  }

  async transferOwnership(newOwnerAddress) {
    const owner = await this.feesWrapper.getOwner();
    if (owner !== this.feesWrapper.defaultAddress) {
      throw new Error('You need to be the owner of the Fees contract to be able to transfer ownership');
    }

    return this.feesWrapper.transferOwnership(newOwnerAddress);
  }

  async setBaseUploadFee(fee) {
    const owner = await this.feesWrapper.getOwner();
    if (owner !== this.feesWrapper.defaultAddress) {
      throw new Error('You need to be the owner of the Fees contract to set an upload fee');
    }

    return this.feesWrapper.setBaseUploadFee(fee);
  }

  async feeForUpload(storagePeriods) {
    return this.feesWrapper.feeForUpload(storagePeriods);
  }

  async feeForChallenge(storagePeriods) {
    return this.feesWrapper.feeForChallenge(storagePeriods);
  }
}
