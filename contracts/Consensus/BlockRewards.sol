/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.22;


import "./ConstructorOwnable.sol";


// From: https://wiki.parity.io/Block-Reward-Contract
contract BlockRewardsBase {
    // produce rewards for the given benefactors, with corresponding reward codes.
    // only callable by `SUPER_USER`
    function reward(address[] benefactors, uint16[] kind) external returns (address[], uint256[]);
}


/**
@title Implementation of Parities Block Reward contract with:
- rewards given only to registered validator 
- rewards amount proportional to `share` assigned to each validator
*/
contract BlockRewards is BlockRewardsBase, ConstructorOwnable {
    address private superUser; // the SUPER_USER address as defined by EIP96. During normal operation should be 2**160 - 2
    uint256 public totalShares;
    uint256 public beneficiaryCount;
    mapping(address => uint) public shares;

    /**
    @notice Constructor
    @param _owner the owner of this contract, that can add/remove valiators and their share.
    @param _superUser SUPER_USER address value injectable for test purpouses. Under normal operation it should be set to 2^160-2 as defined in EIP96 
    */
    constructor(address _owner, address _superUser) public ConstructorOwnable(_owner) {
        superUser = _superUser;
        totalShares = 0;
    }

    function reward(address[] benefactors, uint16[] kind) external returns (address[], uint256[]) {
        require(msg.sender == superUser, "Must be called by super user");
        require(benefactors.length == kind.length, "Input lists need to be of equal length");

        address[] memory retAddresses = new address[](benefactors.length);
        uint256[] memory retAmounts = new uint256[](benefactors.length);

        for (uint i = 0; i < benefactors.length; i++) {
            retAddresses[i] = benefactors[i];
            retAmounts[i] = 1 ether;
        }

        return (retAddresses, retAmounts);
    }

    function addBeneficiary(address beneficiary, uint256 share) public onlyOwner {
        require(share > 0, "Share must be non-zero");
        require(!isBeneficiary(beneficiary), "Is already a beneficiary");
        totalShares += share;
        beneficiaryCount += 1;
        shares[beneficiary] = share;
    }

    function removeBeneficiary(address beneficiary) public onlyOwner {
        require(isBeneficiary(beneficiary), "Is not a beneficiary");
        totalShares -= shares[beneficiary];
        beneficiaryCount -= 1;
        delete shares[beneficiary];
    }

    function isBeneficiary(address beneficiary) public view returns(bool) {
        return shares[beneficiary] > 0;
    }

    function beneficiaryShare(address beneficiary) public onlyOwner returns (uint256) {
        return shares[beneficiary];
    }
}