[![Build Status](https://travis-ci.com/ambrosus/ambrosus-node-contracts.svg?token=nJpF4WjFNNbqCjjVquWn&branch=master)](https://travis-ci.com/ambrosus/ambrosus-node-contracts)
# ambrosus-node-contracts
Smart contracts used in AMB-NET

## Development
Install dependencies and compile contracts:
```
yarn
yarn build
```

To run test RPC mock, with properly predefined accounts for development and testing:
```
yarn task ganache
```

Then deploy contracts and save outcome to configuration file
```
yarn task deploy --save-config
```

You are ready to play.

The following administrative tasks are available: 
```
yarn task deploy
yarn task ganache
yarn task whitelist add [address]
yarn task whitelist remove [address]
yarn task whitelist check
yarn task stake deposit [role] [amount]
yarn task stake release
yarn task stake check
```

## Testing
To install dependencies call:
```
yarn
```

To compile contracts:
```
yarn build
```

To run tests:
```
yarn test
```


Alternatively, to compile contracts and test:
```
yarn testall
```

## Production and deployment
