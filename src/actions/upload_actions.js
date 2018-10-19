/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class UploadActions {
  constructor(uploadsWrapper, feesWrapper, shelteringWrapper) {
    this.uploadsWrapper = uploadsWrapper;
    this.feesWrapper = feesWrapper;
    this.shelteringWrapper = shelteringWrapper;
  }

  async uploadBundle(bundleId, storagePeriods) {
    const {uploadsWrapper: uploads, feesWrapper: fees} = this;
    const value = await fees.feeForUpload(storagePeriods);
    return uploads.registerBundle(bundleId, value, storagePeriods);
  }

  async getBundleUploadData(bundleId) {
    const uploadBlock = await this.shelteringWrapper.getBundleUploadBlockNumber(bundleId);
    if (!uploadBlock) {
      return null;
    }
    return this.uploadsWrapper.getUploadData(bundleId, uploadBlock);
  }
}
