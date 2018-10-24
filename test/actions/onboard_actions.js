/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import OnboardActions from '../../src/actions/onboard_actions';
import {ATLAS, HERMES, APOLLO} from '../../src/constants';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Onboard Actions', () => {
  let onboardActions;
  let kycWhitelistWrapperStub;
  let rolesWrapperStub;

  beforeEach(() => {
    kycWhitelistWrapperStub = {
      hasRoleAssigned: sinon.stub(),
      getRequiredDeposit: sinon.stub()
    };
    rolesWrapperStub = {
      onboardAsAtlas: sinon.stub(),
      onboardAsHermes: sinon.stub(),
      onboardAsApollo: sinon.stub(),
      onboardedRole: sinon.stub()
    };
    onboardActions = new OnboardActions(kycWhitelistWrapperStub, rolesWrapperStub);
  });

  afterEach(() => {
    kycWhitelistWrapperStub.hasRoleAssigned.reset();
    kycWhitelistWrapperStub.getRequiredDeposit.reset();
    rolesWrapperStub.onboardAsAtlas.reset();
    rolesWrapperStub.onboardAsHermes.reset();
    rolesWrapperStub.onboardAsApollo.reset();
  });

  describe('onboardAsAtlas', async () => {
    const address = '0xABCD';
    const url = 'http://example.com';
    const stakeAmount = '12345';

    const callSubject = async () => onboardActions.onboardAsAtlas(address, stakeAmount, url);

    beforeEach(() => {
      kycWhitelistWrapperStub.hasRoleAssigned.resolves(true);
      kycWhitelistWrapperStub.getRequiredDeposit.resolves(stakeAmount.toString());
    });

    it('fails if the address is not whitelisted for ATLAS', async () => {
      kycWhitelistWrapperStub.hasRoleAssigned.resolves(false);

      await expect(callSubject()).to.eventually.be.rejected;

      expect(kycWhitelistWrapperStub.hasRoleAssigned).to.have.been.calledOnceWith(address, ATLAS);
    });

    it('fails if the stakeAmount is not matching the whitlisted pledge', async () => {
      kycWhitelistWrapperStub.getRequiredDeposit.resolves('45678');

      await expect(callSubject()).to.eventually.be.rejected;

      expect(kycWhitelistWrapperStub.getRequiredDeposit).to.have.been.calledOnceWith(address);
    });

    it('works otherwise', async () => {
      await expect(callSubject()).to.eventually.be.fulfilled;

      expect(rolesWrapperStub.onboardAsAtlas).to.have.been.calledOnceWith(address, stakeAmount, url);
    });
  });

  describe('onboardAsHermes', async () => {
    const address = '0xABCD';
    const url = 'http://example.com';

    const callSubject = async () => onboardActions.onboardAsHermes(address, url);

    beforeEach(() => {
      kycWhitelistWrapperStub.hasRoleAssigned.resolves(true);
    });

    it('fails if the address is not whitelisted for HERMES', async () => {
      kycWhitelistWrapperStub.hasRoleAssigned.resolves(false);

      await expect(callSubject()).to.eventually.be.rejected;

      expect(kycWhitelistWrapperStub.hasRoleAssigned).to.have.been.calledOnceWith(address, HERMES);
    });

    it('works otherwise', async () => {
      await expect(callSubject()).to.eventually.be.fulfilled;

      expect(rolesWrapperStub.onboardAsHermes).to.have.been.calledOnceWith(address, url);
    });
  });

  describe('onboardAsApollo', async () => {
    const address = '0xABCD';
    const depositAmount = '12345';

    const callSubject = async () => onboardActions.onboardAsApollo(address, depositAmount);

    beforeEach(() => {
      kycWhitelistWrapperStub.hasRoleAssigned.resolves(true);
      kycWhitelistWrapperStub.getRequiredDeposit.resolves(depositAmount.toString());
    });

    it('fails if the address is not whitelisted for APOLLO', async () => {
      kycWhitelistWrapperStub.hasRoleAssigned.resolves(false);

      await expect(callSubject()).to.eventually.be.rejected;

      expect(kycWhitelistWrapperStub.hasRoleAssigned).to.have.been.calledOnceWith(address, APOLLO);
    });

    it('fails if the depositAmount is not matching the whitlisted pledge', async () => {
      kycWhitelistWrapperStub.getRequiredDeposit.resolves('45678');

      await expect(callSubject()).to.eventually.be.rejected;

      expect(kycWhitelistWrapperStub.getRequiredDeposit).to.have.been.calledOnceWith(address);
    });

    it('works otherwise', async () => {
      await expect(callSubject()).to.eventually.be.fulfilled;

      expect(rolesWrapperStub.onboardAsApollo).to.have.been.calledOnceWith(address, depositAmount);
    });
  });

  describe('getOnboardedRole', async () => {
    const targetAddress = '0xABCD';

    const callSubject = async () => onboardActions.getOnboardedRole(targetAddress);

    beforeEach(() => {
      rolesWrapperStub.onboardedRole.resolves(HERMES);
    });

    it('proxies the call to the wrapper', async () => {
      await expect(callSubject()).to.eventually.be.fulfilled.and.equal(HERMES);

      expect(rolesWrapperStub.onboardedRole).to.have.been.calledOnceWith(targetAddress);
    });
  });
});

