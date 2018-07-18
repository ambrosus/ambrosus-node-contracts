/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {adminAccount} from '../../helpers/account';
import chaiEmitEvents from '../../helpers/chaiEmitEvents';
import deploy from '../../helpers/deploy';
import utils from '../../helpers/utils';

chai.use(chaiEmitEvents);

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('Bundle Registry Contract', () => {
  const bundleId = utils.keccak256('bundleId');
  const vendorUrl = 'node.ambrosus.com';
  const vendor = adminAccount.address;
  let bundleRegistry;
  let web3;
  let ownerAddress;
  let otherAddress;

  const addVendor = (who, url, from = ownerAddress) => bundleRegistry.methods.addToWhitelist(who, url).send({from});
  const removeVendor = (who, from = ownerAddress) => bundleRegistry.methods.removeFromWhitelist(who).send({from});
  const isWhitelisted = (who) => bundleRegistry.methods.isWhitelisted(who).call();
  const addBundle =
    (bundleId, vendor, from = ownerAddress) => bundleRegistry.methods.addBundle(bundleId, vendor).send({from});
  const getBundleVendor = (bundleId) => bundleRegistry.methods.bundles(bundleId).call();
  const getBundleVendorByIndex = (index) => bundleRegistry.methods.bundleIds(index).call();
  const getUrlForVendor = (vendor) => bundleRegistry.methods.getUrlForVendor(vendor).call();
  const getBundleCount = () => bundleRegistry.methods.getBundleCount().call();
  const changeVendorUrl =
    (vendor, url, from = ownerAddress) => bundleRegistry.methods.changeVendorUrl(vendor, url).send({from});

  beforeEach(async () => {
    ({web3, bundleRegistry} = await deploy({contracts: {bundleRegistry: true}}));
    [ownerAddress, otherAddress] = await web3.eth.getAccounts();
  });

  describe('Whitelisting', () => {
    it('owner can add/remove whitelisted addresses', async () => {
      await addVendor(otherAddress, vendorUrl);
      expect(await isWhitelisted(otherAddress)).to.eq(true);

      await removeVendor(otherAddress);
      expect(await isWhitelisted(otherAddress)).to.eq(false);
    });

    it('not whitelisted non-owner can not add/remove whitelisted addresses',
      async () => {
        addVendor(otherAddress, vendorUrl, ownerAddress);
        await expect(addVendor(otherAddress, vendorUrl, otherAddress)).to.be.eventually.rejected;
        await expect(removeVendor(otherAddress, otherAddress)).to.be.eventually.rejected;
      });

    it('whitelisted non-owner can not add/remove whitelisted addresses',
      async () => {
        addVendor(otherAddress, vendorUrl, ownerAddress);
        await expect(addVendor(otherAddress, vendorUrl,
          otherAddress)).to.be.eventually.rejected;
        await expect(
          removeVendor(otherAddress, otherAddress)).to.be.eventually.rejected;
      });
  });

  describe('Updating vendor url', () => {
    beforeEach(async () => {
      await addVendor(otherAddress, vendorUrl);
    });

    it('can get Url', async () => {
      expect(await getUrlForVendor(otherAddress)).to.eq(vendorUrl);
    });

    it('owner can update Url', async () => {
      await changeVendorUrl(otherAddress, 'some.other.url.com');
      expect(await getUrlForVendor(otherAddress)).to.eq('some.other.url.com');
    });

    it('non-owner Url update throws', async () => {
      await expect(changeVendorUrl(otherAddress, 'some.other.url.com',
        otherAddress)).to.be.eventually.rejected;
      expect(await getUrlForVendor(otherAddress)).to.eq(vendorUrl);
    });
  });

  describe('Adding bundles', () => {
    it('Initially there are 0 bundles', async () => {
      expect(await getBundleCount()).to.eq('0');
    });

    it('returns empty address if no bundle with such id stored', async () => {
      const emptyAddress = await bundleRegistry.methods.bundles(
        utils.asciiToHex('notExists')).
        call();
      expect(emptyAddress).to.match(/0x0{32}/);
    });

    it('stores bundleId/uploader_vendorId pairs', async () => {
      await addVendor(ownerAddress, vendorUrl);
      await addBundle(bundleId, vendor);
      expect(await getBundleVendor(bundleId)).to.eq(vendor);
      expect(await getBundleVendorByIndex(0)).to.eq(bundleId);
    });

    it('non-whitelisted address can not add bundle', async () => {
      await expect(addBundle(bundleId, vendor)).to.be.eventually.rejected;
    });

    it('non-owner can add bundle after being whitelisted', async () => {
      await addVendor(otherAddress, vendorUrl);
      await addBundle(bundleId, vendor, otherAddress);
      expect(await getBundleVendor(bundleId)).to.eq(vendor);
    });

    it('emits event when bundle added', async () => {
      await addVendor(ownerAddress, vendorUrl);
      expect(await addBundle(bundleId, vendor)).to.emitEvent('BundleAdded').withArgs({bundleId});
      const otherBundleId = utils.keccak256('bundle2');
      expect(await addBundle(otherBundleId, vendor)).to.emitEvent('BundleAdded').withArgs({bundleId: otherBundleId});
    });
  });
});
