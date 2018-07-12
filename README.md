[![Build Status](https://travis-ci.com/ambrosus/ambrosus-node-contracts.svg?token=nJpF4WjFNNbqCjjVquWn&branch=master)](https://travis-ci.com/ambrosus/ambrosus-node-contracts)
# ambrosus-node-contracts
Smart contracts used in AMB-NET

## Using
Install dependencies and compile contracts:
```
yarn
yarn build
```

Available administrative tasks: 
```
yarn task deploy
yarn task whitelist add
yarn task whitelist remove
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

## Development
To run test RPC mock, with properly predefined accounts for development and testing:
```
yarn ganache
```