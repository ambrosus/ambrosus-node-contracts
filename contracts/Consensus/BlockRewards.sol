/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.22;


import "./ConstructorOwnable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


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
    using SafeMath for uint;

    address private superUser; // the SUPER_USER address as defined by EIP96. During normal operation should be 2**160 - 2
    uint256 public totalShares;
    uint256 public beneficiaryCount;
    uint256 public baseReward;
    mapping(address => uint) public shares;

    event BaseRewardChanged(uint oldBaseReward, uint newBaseReward);

    /**
    @notice Constructor
    @param _owner the owner of this contract, that can add/remove valiators and their share.
    @param _superUser SUPER_USER address value injectable for test purpouses. Under normal operation it should be set to 2^160-2 as defined in EIP96 
    */
    constructor(address _owner, uint256 _baseReward, address _superUser) public ConstructorOwnable(_owner) {
        baseReward = _baseReward;
        superUser = _superUser;
        totalShares = 0;
    }

    function reward(address[] beneficiaries, uint16[] kind) external returns (address[], uint256[]) {
        require(msg.sender == superUser, "Must be called by super user");
        require(beneficiaries.length == kind.length, "Input lists need to be of equal length");

        uint16 i = 0;
        uint16 j = 0;

        uint16 numValid = 0;
        for (i = 0; i < kind.length; i++) {
            if (!isSupportedKind(kind[i]) || !isBeneficiary(beneficiaries[i])) {
                continue;
            }
            numValid += 1;
        }

        address[] memory retAddresses = new address[](numValid);
        uint256[] memory retAmounts = new uint256[](numValid);
        
        for (i = 0; i < beneficiaries.length; i++) {
            if (!isSupportedKind(kind[i]) || !isBeneficiary(beneficiaries[i])) {
                continue;
            }
            retAddresses[j] = (beneficiaries[i]);
            retAmounts[j] = baseReward.mul(beneficiaryCount).mul(beneficiaryShare(beneficiaries[i])).div(totalShares);
            ++j;
        }

        return (retAddresses, retAmounts);
    }

    function addBeneficiary(address beneficiary, uint256 share) public onlyOwner {
        require(share > 0, "Share must be non-zero");
        require(!isBeneficiary(beneficiary), "Is already a beneficiary");
        totalShares = totalShares.add(share);
        beneficiaryCount = beneficiaryCount.add(1);
        shares[beneficiary] = share;
    }

    function removeBeneficiary(address beneficiary) public onlyOwner {
        require(isBeneficiary(beneficiary), "Is not a beneficiary");
        totalShares = totalShares.sub(shares[beneficiary]);
        beneficiaryCount = beneficiaryCount.sub(1);
        delete shares[beneficiary];
    }

    function setBaseReward(uint256 _baseReward) public onlyOwner {
        emit BaseRewardChanged(baseReward, _baseReward);
        baseReward = _baseReward;
    }

    function isBeneficiary(address beneficiary) public view returns(bool) {
        return shares[beneficiary] > 0;
    }

    function beneficiaryShare(address beneficiary) public view returns (uint256) {
        return shares[beneficiary];
    }

    function isSupportedKind(uint16 kind) private pure returns (bool) {
        return kind == 0 || kind == 2;
    }
}
