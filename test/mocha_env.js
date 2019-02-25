/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

require('events').EventEmitter.defaultMaxListeners = 100;
process.env.NODE_ENV = 'test';
process.env.WEB3_RPC = 'ganache';
process.env.WEB3_NODEPRIVATEKEY = '0xfa654acfc59f0e4fe3bd57082ad28fbba574ac55fe96e915f17de27ad9c77696';
