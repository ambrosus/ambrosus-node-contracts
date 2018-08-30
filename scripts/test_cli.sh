#!/bin/bash
yarn build
source scripts/test_cli.env
yarn task ganache&
sleep 3
yarn task deploy --save scripts/test_cli_head.env && \
source scripts/test_cli_head.env && \
yarn task whitelist add 0xEbDEAC82424a053DFf79397862BD122F76798bC5 HERMES 0 && \
yarn task whitelist check 0xEbDEAC82424a053DFf79397862BD122F76798bC5 && \
yarn task whitelist remove 0xEbDEAC82424a053DFf79397862BD122F76798bC5 && \
yarn task whitelist add 0xEbDEAC82424a053DFf79397862BD122F76798bC5 HERMES 0 && \
yarn task onboard HERMES localhost && \
yarn task upload 0xcafe 1 && \
kill -2 `cat ./ganache.pid`

# yarn task transfer start 0xcafe && \
# yarn task transfer list && \
# yarn task transfer cancel 0x75b2d0664a935b0528ef947d0729980ee80dabeb2876d34b76dde1d2b536549a && \
