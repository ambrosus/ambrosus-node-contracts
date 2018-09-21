/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "./Context.sol";


contract Head {
    address public owner;
    Context public context;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ContextChange(Context context);

    modifier onlyOwner() {
        require(msg.sender == owner, "only the owner is allowed to call this method");
        _;
    }

    /**
    @notice Constructor
    @param _owner the owner of this contract.
    */
    constructor(address _owner) public {
        owner = _owner;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "the new owner must not be null");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    function setContext(Context _context) public onlyOwner {
        context = _context;
        emit ContextChange(context);
    }
}


contract Base {
    Head head;

    constructor(Head _head) public {
        head = _head;
    }

    modifier onlyContextInternalCalls() {
        require(context().isInternalToContext(address(msg.sender)), "The message sender is not whitelisted by the context");
        _;
    }

    function context() view public returns (Context) {
        return head.context();
    }
}
