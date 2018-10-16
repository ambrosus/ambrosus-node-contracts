/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const Ganache = require('ganache-core');
const {exec} = require('child_process');
const fs = require('fs');
const dotenv = require('dotenv');

const PORT = 8777;
const WEB3_RPC = `http://localhost:${PORT}`;
const WEB3_NODEPRIVATEKEY = '0xfa654acfc59f0e4fe3bd57082ad28fbba574ac55fe96e915f17de27ad9c77696';

const printError = (message) => console.error('\x1b[31m', message, '\x1b[0m');

const startServer = () => new Promise((resolve, reject) => {
  const server = Ganache.server({
    accounts: [
      {
        balance: '10000000000000000000000000000000000',
        secretKey: WEB3_NODEPRIVATEKEY
      },
      ...Array(9).fill({balance: '10000000000000000000000000000000000'})
    ]
  });
  server.listen(PORT, (err) => {
    if (err) {
      reject(err);
    } else {
      resolve(server);
    }
  });
});

const execute = (command, env = {}) => new Promise((resolve, reject) => {
  console.log(command);
  exec(command, {env: {...process.env, WEB3_RPC, WEB3_NODEPRIVATEKEY, ...env}, cwd: __dirname},
    (error, stdout, stderr) => {
      if (stderr) {
        printError(stderr);
      }
      if (error) {
        reject(error);
      } else {
        console.log(stdout);
        resolve(stdout);
      }
    }
  );
});

startServer()
  .then(async (server) => {
    try {
      const headEnvFile = `${__dirname}/test_cli_head.env`;
      await execute(`yarn task deploy --save ${headEnvFile}`);
      const headConfig = dotenv.parse(fs.readFileSync(headEnvFile));
      await execute(`yarn task whitelist add 0xEbDEAC82424a053DFf79397862BD122F76798bC5 HERMES 0`, headConfig);
      await execute(`yarn task whitelist get 0xEbDEAC82424a053DFf79397862BD122F76798bC5`, headConfig);
      await execute(`yarn task whitelist remove 0xEbDEAC82424a053DFf79397862BD122F76798bC5`, headConfig);
      await execute(`yarn task whitelist add 0xEbDEAC82424a053DFf79397862BD122F76798bC5 HERMES 0`, headConfig);
      await execute(`yarn task onboard HERMES localhost`, headConfig);
      await execute(`yarn task whitelist get 0xEbDEAC82424a053DFf79397862BD122F76798bC5`, headConfig);
      await execute(`yarn task upload 0xcafe 1`, headConfig);
    } catch (err) {
      printError(err);
    }
    server.close();
  });
