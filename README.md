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

Than deploy contracts and save outcome to configuration file
```
yarn task deploy --save-config
```

You are ready to play.

Available of all administrative tasks: 
```
yarn task deploy
yarn task ganache
yarn task whitelist add
yarn task whitelist remove
yarn task whitelist check
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
