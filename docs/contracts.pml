@startuml

package Front <<Rectangle>> {
  class Challenges
  class Transfers
  class Uploads
  class Stakes
  class Payouts
  class Challenge
  class Transfer
}

package Storage <<Rectangle>> {
  class BundleStore
  class Bundle
  class StakeStore
  class Stake
  class KycWhitelist
  class PayoutStorage
}

package Configuration <<Rectangle>> {
  class Fees
  class Roles
}

package Middleware <<Rectangle>> {
  class Sheltering
}

package Boilerplate <<Rectangle>> {
  class Head
  class Context
  class Base
}

Stakes *-- KycWhitelist
Stakes *-- StakeStore
Stakes *-- Sheltering
Challenges *-- Sheltering
Transfers *-- Sheltering
Transfers o-- Transfer
Uploads *-- Sheltering
Challenges o-- Challenge

Payouts *-- PayoutStorage
Challenges *-- Payouts

Transfers ..> Fees
Uploads ..> Fees
Challenges ..> Fees
StakeStore ..> Fees

StakeStore o-- Stake
Sheltering *-- BundleStore
Sheltering *-- StakeStore
BundleStore o-- Bundle

class Stakes {
  depositStake(role) payable
  releaseStake(sheltererId)
}

class Stake #lightgray {
  amount: uint
  storageLimit: uint
  storageLeft: uint
  role: {HERMES, ATLAS, APOLLO}
}

class Uploads {
  registerBundle()  
}

class Payouts {
  withdraw(implicit beneficiaryId)
  available(implicit beneficiaryId, period)
  grantChallengeResolutionReward(beneficiaryId, bundleId) payable
  revokeChallengeResolutionReward(beneficiaryId, bundleId, refundAddress)
}

class PayoutStorage {
  withdraw(beneficiaryId)
  available(beneficiaryId, period)
  grantForPeriods(beneficiaryId, periodStart, periodEnd) payable
  revokeForPeriods(beneficiaryId, periodStart, periodEnd, amount, refundAddress)
}

class StakeStore {
  depositStake(role) payable
  releaseStake(sheltererId)
  slash(sheltererId)
  isStaking(sheltererId)
  canStore(sheltererId)
  isShelteringAny(sheltererId)
}

class Sheltering {
  registerBundle(bundleId, creatorId, time) payable
  removeBundle(sheltererId, bundleId);
  isSheltering(sheltererId, bundleId);
  addSheltering(sheltererId, bundleId);
  removeSheltering(sheltererId, bundleId);
}

class BundleStore {    
  getBundle(bundleId);
  store(bundleId, creatorId);
}

class Bundle #lightgray {
  shelterer: address[]
  bundleId: bytes32
  uploadDate: uint
  shelteringDurationUnits: uint
}

class Challenges {
  start(sheltererId, bundleId, implicit challengerId) payable
  startForSystem(sheltererId, bundleId, numChallenges) payable
  resolve(sheltererId, bundleId)
  storeChallenge(sheltererId, bundleId, challengerId, fee)
  removeChallenge(sheltererId, bundleId)
  inProgress(sheltererId, bundleId)
}

class Challenge #lightgray {
  shelterer : address;
  bundle : byte32;
  creator: address;
  fee: uint;
  activeCount: uint;
}

class Transfers {
  transfer(bundleId, implicit sheltererId) payable
  resolve(sheltererId, bundleId, implicit atlasId)
  tryStoreTransfer(sheltererId, bundleId, fee)
  removeTransfer(sheltererId, bundleId)
}

class Transfer #lightgray {
  sheltererId: address
  bundleId: bytes32
}

class KycWhitelist {
  add(candidateId)
  isWhitelisted(candidateId) : bool
}

class Fees {
  getFeeFor(time, typeOfOperation)
  splitFee() payable
  calculatePenalty(n)
}

class Roles {
  canStake(amount, role);
  getStorageLimit(amount, role);
}

class Head {
  context: Context
  owner: Owner
  setContext(context) onlyOwner
}

Head *-- Context
Context *-- Base

class Context {
  bundleStore: BundleStore
  roles: Roles
  fees: Fees
  stakeStore: StakeStore
  kycWhitelist: KycWhitelist
  transfers: Transfers
  challenges: Challenges
  sheltering: Sheltering
  bundleStore: BundleStore
  stakeStore: StakeStore
  uploads: Uploads
  stakes: Stakes
  canCall()
  Context(bundleStore, ..., stakes)
}


class Base {
  _canCall()
  context()
}

@enduml
