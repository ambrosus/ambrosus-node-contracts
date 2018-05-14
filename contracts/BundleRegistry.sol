/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.19;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract BundleRegistry is Ownable {

  struct Vendor {
    bool whitelisted;
    string url;
  }

  struct Bundle {
    address creator;    
  }

  mapping(bytes32 => Bundle) public bundles;
  mapping(address => Vendor) public vendors;
  
  bytes32[] public bundleIds;

  event BundleAdded(bytes32 bundleId);

  modifier onlyWhitelisted() {
    require(isWhitelisted(msg.sender));
    _;
  }

  function addBundle(bytes32 bundleId, address vendor) onlyWhitelisted public {
    bundleIds.push(bundleId);
    bundles[bundleId] = Bundle(vendor);    
    emit BundleAdded(bundleId);
  }
 
  function getBundleCount() public view returns(uint) {
    return bundleIds.length;
  }

  function getVendorForBundle(bytes32 bundleId) public view returns (address) {
    return bundles[bundleId].creator;
  }

  function addToWhitelist(address vendor, string url) onlyOwner public {
    vendors[vendor].whitelisted = true;
    vendors[vendor].url = url;
  }

  function removeFromWhitelist(address vendor) onlyOwner public {
    vendors[vendor].whitelisted = false;
  }

  function isWhitelisted(address vendor) view public returns (bool) {
    return vendors[vendor].whitelisted;
  }

  function changeVendorUrl(address vendor, string url) onlyOwner public {
    vendors[vendor].url = url;
  }

  function getUrlForVendor(address vendor) public view returns (string) {
    return vendors[vendor].url;
  }

}
