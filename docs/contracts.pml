@startuml

package Consensus <<Rectangle>> {
  class ValidatorSetBase
  class ValidatorSet
  class BlockRewardsBase
  class BlockRewards
}

package Storage <<Rectangle>> {
  class KycWhitelistStore
  class RolesStore
  class AtlasStakeStore
  class ApolloDepositStore
  class BundleStore
  class ChallengesStore
  class PayoutsStore
  class ShelteringTransfersStore
}

package Configuration <<Rectangle>> {
  class Fees
  class Roles
  class Config
}

package Utilities <<Rectangle>> {
  class Time
  class Ownable
  class ConstructorOwnable
  class Math
  class SafeMath
  class SafeMathExtensions
  class DmpAlgorithm
}

package Middleware <<Rectangle>> {
  class Sheltering
  class ValidatorProxy
}

package Boilerplate <<Rectangle>> {
  class Head
  class Context
  class Base
  class Catalogue
  class StorageCatalogue
}

package Testing <<Rectangle>> {
  class SafeMathExtensionsAdapter
  class DmpAlgorithmAdapter
  class SuperSpeedTime
  class SuperSpeedConfig
  class CalledContract
  class CallerContract
  class MockContext
  class TimeMock
  class AtlasStakeStoreMock
  class ChallengesStoreMock
}

package Front <<Rectangle>> {
  class KycWhitelist
  class Roles
  class Uploads
  class Challenges
  class Payouts
  class ShelteringTransfers
}

ValidatorSet ..|> ConstructorOwnable
ValidatorSet ..|> ValidatorSetBase
BlockRewards ..|> ConstructorOwnable
BlockRewards ..|> BlockRewardsBase
BlockRewards *-- SafeMath
ValidatorProxy *-- ValidatorSet
ValidatorProxy *-- BlockRewards

Head ..|> ConstructorOwnable
Head *-- Context
Context *-- Base
Context *-- Catalogue
Context *-- StorageCatalogue

Catalogue *-- KycWhitelist 
Catalogue *-- Roles 
Catalogue *-- Fees
Catalogue *-- Challenges 
Catalogue *-- Payouts 
Catalogue *-- ShelteringTransfers 
Catalogue *-- Sheltering 
Catalogue *-- Uploads 
Catalogue *-- Config 
Catalogue *-- ValidatorProxy
Catalogue *-- Time

StorageCatalogue *-- ApolloDepositStore
StorageCatalogue *-- AtlasStakeStore
StorageCatalogue *-- BundleStore
StorageCatalogue *-- ChallengesStore
StorageCatalogue *-- KycWhitelistStore
StorageCatalogue *-- PayoutsStore
StorageCatalogue *-- RolesStore
StorageCatalogue *-- ShelteringTransfersStore

Fees ..|> Ownable
Fees *-- Config
Fees *-- Time

Time *-- SafeMath
Time *-- SafeMathExtensions

DmpAlgorithm *-- SafeMath
DmpAlgorithm *-- SafeMathExtensions

Challenges *-- SafeMath
Challenges *-- SafeMathExtensions
Challenges *-- DmpAlgorithm

Challenges *-- Time
Challenges *-- Sheltering
Challenges *-- AtlasStakeStore 
Challenges *-- Config 
Challenges *-- Fees 
Challenges *-- ChallengesStore

KycWhitelist ..|> Ownable
KycWhitelist *-- KycWhitelistStore
KycWhitelist *-- Config

Payouts *-- SafeMath
Payouts *-- SafeMathExtensions
Payouts *-- Time
Payouts *-- PayoutsStore
Payouts *-- Config

Roles *-- AtlasStakeStore
Roles *-- RolesStore 
Roles *-- ApolloDepositStore 
Roles *-- ValidatorProxy 
Roles *-- KycWhitelist 
Roles *-- Config 

ShelteringTransfers *-- Sheltering
ShelteringTransfers *-- ShelteringTransfersStore
ShelteringTransfers *-- Challenges

Uploads *-- SafeMath
Uploads *-- Config
Uploads *-- Fees
Uploads *-- Sheltering
Uploads *-- Challenges

Sheltering *-- SafeMath
Sheltering *-- SafeMathExtensions
Sheltering *-- Time 
Sheltering *-- AtlasStakeStore 
Sheltering *-- BundleStore 
Sheltering *-- Payouts 
Sheltering *-- RolesStore 
Sheltering *-- Fees 
Sheltering *-- Config

AtlasStakeStore *-- SafeMath
AtlasStakeStore *-- SafeMathExtensions

BundleStore *-- SafeMath
BundleStore *-- SafeMathExtensions

ChallengesStore *-- SafeMath
ChallengesStore *-- SafeMathExtensions

KycWhitelistStore *-- Consts

PayoutsStore *-- SafeMath
PayoutsStore *-- SafeMathExtensions

RolesStore *-- Consts

AtlasStakeStoreMock ..|> AtlasStakeStore
ChallengesStoreMock ..|> ChallengesStore
SafeMathExtensionsAdapter *-- SafeMathExtensions
TimeMock ..|> Time

@enduml
