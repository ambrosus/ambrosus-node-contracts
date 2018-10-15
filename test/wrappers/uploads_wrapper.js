/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon, {resetHistory} from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import UploadsWrapper from '../../src/wrappers/uploads_wrapper';
import {createWeb3, utils} from '../../src/utils/web3_tools';
import deploy from '../helpers/deploy';
import HeadWrapper from '../../src/wrappers/head_wrapper';
import {HERMES} from '../../src/consts';
import BN from 'bn.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Uploads Wrapper', () => {
  let uploadsWrapper;

  describe('registerBundle', () => {
    const bundleId = '0xc0ffee';
    const storagePeriods = 23;
    const defaultAccount = '0x123';
    const fee = '100';
    const exampleData = '0xda7a';
    const encodeAbiStub = sinon.stub().resolves(exampleData);
    let contractMock;
    let registerBundleStub;
    let registerBundleSendStub;

    before(async () => {
      registerBundleStub = sinon.stub();
      registerBundleSendStub = sinon.stub();
      contractMock = {
        methods: {
          registerBundle: registerBundleStub
        }
      };
      registerBundleStub.returns({
        send: registerBundleSendStub,
        encodeABI: encodeAbiStub
      });
    });

    afterEach(() => {
      resetHistory(contractMock);
    });

    describe('sendTransactions = true', () => {
      before(() => {
        uploadsWrapper = new UploadsWrapper({}, {}, defaultAccount, true);
        sinon.stub(uploadsWrapper, 'contract').resolves(contractMock);
      });

      it('calls contract method with correct arguments', async () => {
        await uploadsWrapper.registerBundle(bundleId, fee, storagePeriods);
        expect(registerBundleStub).to.be.calledOnceWith(bundleId, storagePeriods);
        expect(registerBundleSendStub).to.be.calledOnceWith({from: defaultAccount, value: fee});
      });
    });

    describe('sendTransactions = false', () => {
      before(() => {
        uploadsWrapper = new UploadsWrapper({}, {}, defaultAccount, false);
        sinon.stub(uploadsWrapper, 'contract').resolves(contractMock);
      });

      it('returns data', async () => {
        expect(await uploadsWrapper.registerBundle(bundleId, fee, storagePeriods)).to.equal(exampleData);
        expect(registerBundleStub).to.be.calledWith(bundleId, storagePeriods);
        expect(registerBundleSendStub).to.be.not.called;
        expect(encodeAbiStub).to.be.calledOnceWith();
      });
    });
  });

  describe('getUploadData', () => {
    let web3;
    let uploader;
    const bundleId = utils.keccak256('someBundleId');
    const otherBundleId = utils.keccak256('otherBundleId');
    before(async () => {
      web3 = await createWeb3();
      [uploader] = await web3.eth.getAccounts();
      const {head, fees, rolesStore} = await deploy({
        web3,
        contracts: {
          rolesStore: true,
          challenges: true,
          challengesStore: true,
          uploads: true,
          sheltering: true,
          time: true,
          fees: true,
          config: true,
          bundleStore: true}
      });
      uploadsWrapper = new UploadsWrapper(new HeadWrapper(head.options.address, web3, uploader), web3, uploader);
      const fee = new BN(await fees.methods.getFeeForUpload(1).call());
      await rolesStore.methods.setRole(uploader, HERMES).send({from: uploader});
      await uploadsWrapper.registerBundle(bundleId, fee, 1);
      await uploadsWrapper.registerBundle(otherBundleId, fee, 1);
    });

    it('gets BundleUploaded event and returns correct values properties', async () => {
      const uploadData = await uploadsWrapper.getUploadData(bundleId);
      expect(uploadData.transactionHash).to.match(/^0x[0-9a-f]{64}$/i);
      expect(uploadData.blockNumber).to.be.a('number');
      expect(uploadData.uploader).to.equal(uploader);
    });
  });
});
