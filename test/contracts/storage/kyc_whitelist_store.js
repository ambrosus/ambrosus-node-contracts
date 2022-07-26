/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import {makeSnapshot, restoreSnapshot} from '../../../src/utils/web3_tools';
import {createWeb3Ganache} from '../../utils/web3_tools';
import deploy from '../../helpers/deploy';
import {APOLLO, ATLAS, APOLLO_DEPOSIT, ATLAS1_STAKE} from '../../../src/constants';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const {expect} = chai;

describe('KYC Whitelist Store Contract', () => {
  let web3;
  let whitelistOwner;
  let applicant;
  let kycWhitelistStore;
  let snapshotId;

  const getRoleAssigned = async (address) => kycWhitelistStore.methods.getRoleAssigned(address).call();
  const getRequiredDeposit = async (address) => kycWhitelistStore.methods.getRequiredDeposit(address).call();
  const set = async (address, role, deposit, sender) => kycWhitelistStore.methods.set(address, role, deposit).send({from: sender});

  before(async () => {
    web3 = await createWeb3Ganache();
    [whitelistOwner, applicant] = await web3.eth.getAccounts();
    ({kycWhitelistStore} = await deploy({
      web3,
      sender: whitelistOwner,
      contracts: {
        kycWhitelistStore: true,
        config: true
      }
    }));
  });

  beforeEach(async () => {
    snapshotId = await makeSnapshot(web3);
  });

  afterEach(async () => {
    await restoreSnapshot(web3, snapshotId);
  });

  it(`sets and gets values correctly`, async () => {
    expect(await getRoleAssigned(applicant)).to.equal('0');
    expect(await getRequiredDeposit(applicant)).to.equal('0');
    await set(applicant, ATLAS, ATLAS1_STAKE, whitelistOwner);
    expect(await getRoleAssigned(applicant)).to.equal(ATLAS.toString());
    expect(await getRequiredDeposit(applicant)).to.equal(ATLAS1_STAKE.toString());
  });

  it('does not allow non internal calls', async () => {
    await expect(set(applicant, APOLLO, APOLLO_DEPOSIT, applicant)).to.be.rejected;
  });
});
