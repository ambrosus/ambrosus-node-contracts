/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import AtlasStakeStoreWrapper from '../../src/wrappers/atlas_stake_store_wrapper';

chai.use(sinonChai);
const {expect} = chai;

describe('Atlas stake store wrapper', () => {
  let atlasStakeStoreWrapper;

  describe('isShelteringAny', () => {
    let isShelteringAnyStub;
    let isShelteringAnyCallStub;
    const nodeAddress = '0xc0ffee';

    beforeEach(async () => {
      isShelteringAnyStub = sinon.stub();
      isShelteringAnyCallStub = sinon.stub();
      const contractMock = {
        methods: {
          isShelteringAny: isShelteringAnyStub.returns({
            call: isShelteringAnyCallStub.resolves(true)
          })
        }
      };
      atlasStakeStoreWrapper = new AtlasStakeStoreWrapper();
      sinon.stub(atlasStakeStoreWrapper, 'contract').resolves(contractMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await atlasStakeStoreWrapper.isShelteringAny(nodeAddress)).to.equal(true);
      expect(isShelteringAnyStub).to.be.calledOnceWith(nodeAddress);
      expect(isShelteringAnyCallStub).to.be.calledOnce;
    });
  });
});
