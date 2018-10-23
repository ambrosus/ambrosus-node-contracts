/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import BN from 'bn.js';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import WhitelistActions from '../../src/actions/whitelist_actions';
import {ATLAS, HERMES} from '../../src/consts';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Whitelist Actions', () => {
  let whitelistActions;
  let kycWhitelistWrapperStub;
  const targetAddress = '0xABCD';
  const ownerAddress = '0xBEAF';

  beforeEach(() => {
    kycWhitelistWrapperStub = {
      defaultAddress: 0,
      getOwner: sinon.stub(),
      isWhitelisted: sinon.stub(),
      add: sinon.stub(),
      remove: sinon.stub(),
      getRoleAssigned: sinon.stub(),
      getRequiredDeposit: sinon.stub()
    };
    whitelistActions = new WhitelistActions(kycWhitelistWrapperStub);
  });

  afterEach(() => {
    kycWhitelistWrapperStub.getOwner.reset();
    kycWhitelistWrapperStub.isWhitelisted.reset();
    kycWhitelistWrapperStub.add.reset();
    kycWhitelistWrapperStub.remove.reset();
  });

  describe('add', async () => {
    const role = ATLAS;
    const requiredDeposit = new BN(12345);

    const callSubject = async () => whitelistActions.add(targetAddress, role, requiredDeposit);

    beforeEach(() => {
      kycWhitelistWrapperStub.defaultAddress = ownerAddress;
      kycWhitelistWrapperStub.getOwner.resolves(ownerAddress);
      kycWhitelistWrapperStub.isWhitelisted.resolves(false);
      kycWhitelistWrapperStub.add.resolves();
    });

    it('fails if the sender address is not the owner of the whitelist', async () => {
      kycWhitelistWrapperStub.defaultAddress = `0x5O40`;

      await expect(callSubject()).to.eventually.be.rejected;

      expect(kycWhitelistWrapperStub.getOwner).to.have.been.calledOnceWith();
    });

    it('fails if target address is already whitelisted', async () => {
      kycWhitelistWrapperStub.isWhitelisted.resolves(true);

      await expect(callSubject()).to.eventually.be.rejected;

      expect(kycWhitelistWrapperStub.isWhitelisted).to.have.been.calledOnceWith(targetAddress);
    });

    it('works otherwise', async () => {
      await expect(callSubject()).to.eventually.be.fulfilled;

      expect(kycWhitelistWrapperStub.add).to.have.been.calledOnceWith(targetAddress, role, requiredDeposit);
    });
  });

  describe('remove', async () => {
    const callSubject = async () => whitelistActions.remove(targetAddress);

    beforeEach(() => {
      kycWhitelistWrapperStub.defaultAddress = ownerAddress;
      kycWhitelistWrapperStub.getOwner.resolves(ownerAddress);
      kycWhitelistWrapperStub.isWhitelisted.resolves(true);
      kycWhitelistWrapperStub.add.resolves();
    });

    it('fails if the sender address is not the owner of the whitelist', async () => {
      kycWhitelistWrapperStub.defaultAddress = `0x5O40`;

      await expect(callSubject()).to.eventually.be.rejected;

      expect(kycWhitelistWrapperStub.getOwner).to.have.been.calledOnceWith();
    });

    it('fails if target address is not whitelisted for any role', async () => {
      kycWhitelistWrapperStub.isWhitelisted.resolves(false);

      await expect(callSubject()).to.eventually.be.rejected;

      expect(kycWhitelistWrapperStub.isWhitelisted).to.have.been.calledOnceWith(targetAddress);
    });

    it('works otherwise', async () => {
      await expect(callSubject()).to.eventually.be.fulfilled;

      expect(kycWhitelistWrapperStub.remove).to.have.been.calledOnceWith(targetAddress);
    });
  });

  describe('get', async () => {
    const callSubject = async () => whitelistActions.get(targetAddress);

    beforeEach(() => {
      kycWhitelistWrapperStub.getRoleAssigned.resolves(HERMES);
      kycWhitelistWrapperStub.getRequiredDeposit.resolves('123456');
    });

    it('proxies the call to the wrapper', async () => {
      await expect(callSubject()).to.eventually.be.fulfilled.and.deep.equal({
        role: HERMES,
        requiredDeposit: '123456'
      });

      expect(kycWhitelistWrapperStub.getRoleAssigned).to.have.been.calledOnceWith(targetAddress);
      expect(kycWhitelistWrapperStub.getRequiredDeposit).to.have.been.calledOnceWith(targetAddress);
    });
  });
});

