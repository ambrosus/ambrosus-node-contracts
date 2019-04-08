[![Build Status](https://travis-ci.com/ambrosus/ambrosus-node-contracts.svg?token=nJpF4WjFNNbqCjjVquWn&branch=master)](https://travis-ci.com/ambrosus/ambrosus-node-contracts)
# ambrosus-node-contracts
Smart contracts used in AMB-NET

## Development
Install dependencies and compile contracts:
```bash
yarn
yarn build
```

First you need an RPC running. For example you may want to start ganache-cli with running
```bash
yarn global add ganache-cli
ganache-cli -e 1000000
```

Next you need to set environment variables for the RPC address and private key. In case you run ganache copy one of the available private keys and set
```bash
export WEB3_RPC=http://localhost:8545
export WEB3_NODEPRIVATEKEY="COPIED_PRIVATE_KEY"
```

Then you need to set the addresses of multisig validators. It is comma separated list of addresses with C-level validators in the first place.
```bash
export MULTISIG_APPROVAL_ADDRESSES="CLEVEL_ADDRESS1,CLEVEL_ADDRESS2,CLEVEL_ADDRESS3,APPROVAL_ADDRESS4,APPROVAL_ADDRESS5,APPROVAL_ADDRESS6"
```

Then deploy genesis contracts and save outcome to an environment file
```bash
yarn task deployGenesis --save <path to file>
```

Finally deploy the cryptoeconomy contracts:
```bash
yarn task deploy initial
```

Or deploy an update to the cryptoeconomy contracts:
```bash
yarn task deploy update
```

You are ready to play.

The following administrative tasks are available: 
```bash
yarn task deployGenesis (only for testing purposes as this are normally included in the genesis block)
yarn task deploy initial [turbo mode flag] 
yarn task deploy update [turbo mode flag] 
yarn task whitelist add [address] [node type] [required stake/deposit]
yarn task whitelist remove [address]
yarn task whitelist get [address]
yarn task onboard [node type]
yarn task upload [bundleId] [storagePeriods]
yarn task nodeService setUrl [new node url]
yarn task payouts period
yarn task payouts total
yarn task payouts withdraw
```

## Testing
To install dependencies call:
```bash
yarn
```

To compile contracts:
```bash
yarn build
```

To run tests:
```bash
yarn test:units
yarn test:tasks
```

Alternatively, to compile contracts and test:
```bash
yarn test:all
```

To check gas consumption of common operations
```bash
yarn test:gasbenchmark
```

## Production and deployment

Before distributing the compiled contract files you should strip away unnecessary fields: 

```bash
yarn strip
```
