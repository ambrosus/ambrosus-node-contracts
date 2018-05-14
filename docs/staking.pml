@startuml

title Staking

actor Shelterer
actor Ambrosus

box "Smart Contracts" 	
	participant Stakes
  participant KycWhitelist
  participant Roles
  participant StakeStore
end box

== Onboarding ==

Ambrosus -> KycWhitelist: add(candidateId)
activate KycWhitelist
Ambrosus <-- KycWhitelist
deactivate KycWhitelist

Shelterer -> Stakes: depositStake(role, implicit candidateId) payable(amount)
activate Stakes

Stakes -> KycWhitelist: isWhitelisted(candidateId)
activate KycWhitelist
Stakes <-- KycWhitelist
deactivate KycWhitelist

Stakes -> Roles: canStake(amount, role)
activate Roles
Stakes <-- Roles
deactivate Roles

Stakes -> Roles: getStorageLimit(amount, role)
activate Roles
Stakes <-- Roles
deactivate Roles

Stakes -> StakeStore: depositStake(amount, storageLimit, role) payable(amount) internal
activate StakeStore
Stakes <- StakeStore
deactivate StakeStore

Shelterer <-- Stakes
deactivate Stakes

== Exit ==
Shelterer -> Stakes: releaseStake(implicit sheltererId)
activate Stakes



Stakes -> StakeStore: releaseStake(sheltererId)
activate StakeStore
StakeStore -> StakeStore: isShelteringAny(sheltererId)
activate StakeStore
deactivate StakeStore

StakeStore -> StakeStore: isStaking(sheltererId)
activate StakeStore
deactivate StakeStore
Shelterer <- StakeStore : stakeReturn
Stakes <-- StakeStore
deactivate StakeStore

Shelterer <-- Stakes
deactivate Stakes


@enduml
