/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe.skip('Transfers Contract', () => {
  beforeEach(async () => {
  });

  describe('Starting transfer', () => {
    beforeEach(async () => {
    });
    
    it('Fails if sender does not shelter specified bundle', async () => {
    });
    
    it('Fails if provided fee is too low', async () => {
    });
    
    it('Fails if identical transfer already exists', async () => {
    });
    
    it('Creates transfer and emits an event', async () => {
    });

    describe('Stores transfer correctly', () => {
      beforeEach(async () => {
      });
    
      it('Old shelterer id', async () => {
      });
    
      it('Bundle id', async () => {
      });
    
      it('Transfer fee', async () => {
      });
    });
  });
});
