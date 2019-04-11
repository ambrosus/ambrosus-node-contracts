/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const Ganache = require('ganache-core');
const {exec} = require('child_process');
const fs = require('fs');
const dotenv = require('dotenv');

const PORT = 8777;

const adminUser = {
  privateKey: '0x0437b4d845f99fd40155fe63379c961d93c1f4fbd1eb42b75328f7baf754ab48',
  address: '0x2C72a45FC3A7A48C9dB1ab40c31df0f58c27fcdb'
};

const apolloUser = {
  privateKey: '0x8deeb01a11f8dab88027556125eadc7110caa0d938464c5ac33bcd4e2b79c7de',
  address: '0xD09f1d3855159bDBC3D2a292e3960786C701Eb0B'
};

const atlasUser = {
  privateKey: '0x1572c318193427f664b526e2c1710f441122f5929acb0dcc5054fbed1f5c966f',
  address: '0xD392341D72e1B2B3b6dE02604e7913A60D7B21Ae'
};

const hermesUser = {
  privateKey: '0x2c6d57b31ca7c55ca76417d16650136ae625d37ef2824553eb52153dd86a91e7',
  address: '0xC04c60FB732724a287f147f8bfC1cEF108a0C45b'
};

const approvalPrivateKeys = ["0xc5864529cc942df9af41a090c7bf2821526eb0ba3bb261d8065405e993861f51",
  "0x1c18894f8a7ce931665bec962c3aa78fff221232910d49f322003dd2989a4c7f",
  "0x6013af822c32929bf718da5819286792742895d7ec5b00cde08515fc13196433",
  "0xf97bc3369aa07c564e886b90776902584c7f56396f6f02d9f3bfec6814a44ac0",
  "0x76cead93f8a339ebf8ca15142ab0fb2c1643e44a31a275daa202f7631fc40370",
  "0x52fd07f4d1f558336991a1754a74e38acbbad612eae8e2a1ee57bb76d9ca159a"];

const approvalPuiblicKeys = "0x6fbee88fe88494f27f4af87b0d3051665cc0f8b7,0x37db0b19c5cd9d7d8c846c14d1083438013bf578,0x8d01a621bab4d2b2bf022667a4329096dfce7e6e,0x41812f66faf66fe3e10f5b5bc61abff9f6c91ed6,0x497652703fbf03aa36354ab4a67a1eccaa32db61,0xaa5422745e0965d04502ed5d46328d753fc69f0b"
const printError = (message) => console.error('\x1b[31m', message, '\x1b[0m');

const startGanacheServer = (privateKeys) => new Promise((resolve, reject) => {
  const accountRequests = privateKeys.map((value) => ({
    balance: '10000000000000000000000000000000000',
    secretKey: value
  }));
  const server = Ganache.server({
    accounts: [
      ...accountRequests,
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
  exec(command, {env: {...process.env, ...env}, cwd: __dirname},
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

const envForUser = (account) => ({
  WEB3_RPC: `http://localhost:${PORT}`,
  WEB3_NODEPRIVATEKEY: account.privateKey,
  MULTISIG_APPROVAL_ADDRESSES: approvalPuiblicKeys
});

startGanacheServer(
  [
    adminUser.privateKey,
    apolloUser.privateKey,
    atlasUser.privateKey,
    hermesUser.privateKey,
    approvalPrivateKeys[0],
    approvalPrivateKeys[1],
    approvalPrivateKeys[2],
    approvalPrivateKeys[3],
    approvalPrivateKeys[4],
    approvalPrivateKeys[5]
  ])
  .then(async (server) => {
    let failed = false;
    try {
      const deployEnvFile = `${__dirname}/test_cli_head.env`;
      await execute(`yarn task deployGenesis --save ${deployEnvFile}`, envForUser(adminUser));
      const deployConfig = dotenv.parse(fs.readFileSync(deployEnvFile));
      const adminEnv = {
        ...envForUser(adminUser),
        ...deployConfig
      };
      const apolloEnv = {
        ...envForUser(apolloUser),
        ...deployConfig
      };
      const atlasEnv = {
        ...envForUser(atlasUser),
        ...deployConfig
      };
      const hermesEnv = {
        ...envForUser(hermesUser),
        ...deployConfig
      };

      await execute(`yarn task deploy initial`, adminEnv);

      const verifyFails = async (work) => {
        let failed = false;
        try {
          await work();
        } catch (err) {
          failed = true;
        }
        if (!failed) {
          throw new Error('Should have failed');
        }
      };

      const extractMultiplexerAddress = (stdout) => {
        const regex = /multiplexer -> (0x[a-f0-9]{40})/i;
        const match = regex.exec(stdout);
        return match[1];
      };

      console.log('------ test deploy update ------');
      adminEnv.MULTIPLEXER_CONTRACT_ADDRESS = extractMultiplexerAddress(await execute(`yarn task deploy update`, adminEnv));

      await verifyFails(async () => {
        await execute(`yarn task deploy update`, apolloEnv);
      });

      await execute(`yarn task deployMultisig --save ${deployEnvFile}`, envForUser(adminUser));

      const verifyNodeState = async (address, whitelistedRole, onboardedRole, stake, url) => {
        const ret = await execute(`yarn task whitelist get ${address}`, adminEnv);
        const regexStr = `Address ${address} is whitelisted for the ${whitelistedRole} role with ${stake} AMB deposit/stake\\W+Address ${address} is onboarded for the ${onboardedRole} role with url:\\W*${url}`;
        const regex = new RegExp(regexStr, 'g');
        if (!regex.test(ret)) {
          throw new Error('Expected whitelist/onboard state not present');
        }
      };

      // TODO uncomment after multisig is ready
      // const verifyOwnershipState = async (address, expectedOwner) => {
      //   const ret = await execute(`yarn task checkOwnership ${address}`, adminEnv);
      //   const regex = new RegExp(expectedOwner, 'g');
      //   if (!regex.test(ret)) {
      //     throw new Error(`Expected contract owner to be ${expectedOwner} but got ${ret}`);
      //   }
      // };
      //
      // console.log('------ test multiplexer ------');
      // await execute(`yarn task moveOwnershipToMultiplexer ${adminEnv.MULTIPLEXER_CONTRACT_ADDRESS}`, adminEnv);
      // await verifyOwnershipState(deployConfig.HEAD_CONTRACT_ADDRESS, adminEnv.MULTIPLEXER_CONTRACT_ADDRESS);
      // await execute(`yarn task moveOwnershipFromMultiplexer ${adminUser.address}`, adminEnv);
      // await verifyOwnershipState(deployConfig.HEAD_CONTRACT_ADDRESS, adminUser.address);

      console.log('------ test whitelisting ------');
      await verifyNodeState(apolloUser.address, 'NONE', 'NONE', '0', '');
      await execute(`yarn task whitelist add ${apolloUser.address} APOLLO 250000`, adminEnv);
      await verifyNodeState(apolloUser.address, 'APOLLO', 'NONE', '250000', '');
      await execute(`yarn task whitelist remove ${apolloUser.address}`, adminEnv);
      await verifyNodeState(apolloUser.address, 'NONE', 'NONE', '0', '');

      console.log('------ test APOLLO onboarding ------');
      await execute(`yarn task whitelist add ${apolloUser.address} APOLLO 250000`, adminEnv);
      await verifyNodeState(apolloUser.address, 'APOLLO', 'NONE', '250000', '');
      await execute(`yarn task onboard APOLLO 250000`, apolloEnv);
      await verifyNodeState(apolloUser.address, 'APOLLO', 'APOLLO', '250000', '');
      await execute(`yarn task retire`, apolloEnv);
      await verifyNodeState(apolloUser.address, 'APOLLO', 'NONE', '250000', '');

      console.log('------ test ATLAS onboarding ------');
      await execute(`yarn task whitelist add ${atlasUser.address} ATLAS 75000`, adminEnv);
      await verifyNodeState(atlasUser.address, 'ATLAS', 'NONE', '75000', '');
      await execute(`yarn task onboard ATLAS 75000 http://example.com`, atlasEnv);
      await verifyNodeState(atlasUser.address, 'ATLAS', 'ATLAS', '75000', 'http://example.com');
      await execute(`yarn task nodeService setUrl http://amazon.com`, atlasEnv);
      await verifyNodeState(atlasUser.address, 'ATLAS', 'ATLAS', '75000', 'http://amazon.com');
      await execute(`yarn task retire`, atlasEnv);
      await verifyNodeState(atlasUser.address, 'ATLAS', 'NONE', '75000', '');

      console.log('------ test HERMES onboarding ------');
      await execute(`yarn task whitelist add ${hermesUser.address} HERMES 0`, adminEnv);
      await verifyNodeState(hermesUser.address, 'HERMES', 'NONE', '0', '');
      await execute(`yarn task onboard HERMES http://example.com`, hermesEnv);
      await verifyNodeState(hermesUser.address, 'HERMES', 'HERMES', '0', 'http://example.com');
      await execute(`yarn task nodeService setUrl http://google.com`, hermesEnv);
      await verifyNodeState(hermesUser.address, 'HERMES', 'HERMES', '0', 'http://google.com');
      await execute(`yarn task retire`, hermesEnv);
      await verifyNodeState(hermesUser.address, 'HERMES', 'NONE', '0', '');
    } catch (err) {
      printError(err);
      failed = true;
    }
    server.close();
    if (failed) {
      process.exit(1);
    }
  });
