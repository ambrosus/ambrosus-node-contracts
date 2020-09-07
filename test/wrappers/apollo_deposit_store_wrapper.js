/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import ApolloDepositStoreWrapper from '../../src/wrappers/apollo_deposit_store_wrapper';

chai.use(sinonChai);
const {expect} = chai;

describe('Apollo deposit store wrapper', () => {
  let apolloDepositStoreWrapper;

  let isDepositingStub;
  let isDepositingCallStub;

  const nodeAddress = '0xc0ffee';

  beforeEach(async () => {
    isDepositingStub = sinon.stub();
    isDepositingCallStub = sinon.stub();

    const contractMock = {
      methods: {
        isDepositing: isDepositingStub.returns({
          call: isDepositingCallStub.resolves(true)
        })
      }
    };
    apolloDepositStoreWrapper = new ApolloDepositStoreWrapper();
    sinon.stub(apolloDepositStoreWrapper, 'contract').resolves(contractMock);
  });

  describe('isDepositing', () => {
    it('calls contract method with correct arguments', async () => {
      expect(await apolloDepositStoreWrapper.isDepositing(nodeAddress)).to.equal(true);
      expect(isDepositingStub).to.be.calledOnceWith(nodeAddress);
      expect(isDepositingCallStub).to.be.calledOnce;
    });
  });
});
