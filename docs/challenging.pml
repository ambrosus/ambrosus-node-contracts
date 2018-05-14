@startuml

title Challenging

actor Anybody
actor Atlas

box "Smart Contracts" 	
	participant Challenges
  participant Sheltering
  participant StakeContract
  participant Fees
  participant StakeStore
end box

== Start a challenge ==

Anybody -> Fees: getFeeFor(time, CHALLENGE)
activate Fees
Anybody <-- Fees
deactivate Fees

Anybody -> Challenges: start(sheltererId, bundleId, implicit challengerId) payable
activate Challenges

Challenges -> Sheltering: isSheltering(sheltererId, bundleId)
activate Sheltering
Challenges <-- Sheltering
deactivate Sheltering

Challenges -> Fees: getFeeFor(time, CHALLENGE)
activate Fees
Challenges <-- Fees
deactivate Fees

Challenges -> Challenges: storeChallenge(sheltererId, bundleId, challengerId, fee)
activate Challenges
deactivate Challenges

Anybody <-- Challenges
deactivate Challenges

== Resolve a challenge ==

Atlas -> Challenges: resolve(sheltererId, bundleId, implicit atlasId)
activate Challenges

Challenges -> Sheltering: isSheltering(atlasId, bundleId)
activate Sheltering
Challenges <-- Sheltering
deactivate Sheltering

Challenges -> StakeStore: canStore(atlasId)
activate StakeStore
Challenges <-- StakeStore
deactivate StakeStore

Challenges -> Sheltering: addSheltering(atlasId, bundleId)
activate Sheltering
Challenges <-- Sheltering
deactivate Sheltering

Challenges -> Challenges: removeChallenge(atlasId, bundleId)
activate Challenges
deactivate Challenges
Atlas <-- Challenges: transfer
deactivate Challenges

== Reject a challenge (timeout) ==

Anybody -> Challenges: timeout(sheltererId, bundleId, implicit challengerId)
activate Challenges

Challenges -> Fees: calculatePenalty(sheltererId, n)
activate Fees
Challenges<-- Fees
deactivate Fees

Challenges -> StakeContract: slash(sheltererId, challengerId, amount)
activate StakeContract
Anybody <- StakeContract: reward
Challenges <-- StakeContract
deactivate StakeContract

Challenges -> Sheltering: removeSheltering(sheltererId, bundleId)
activate Sheltering
Challenges <-- Sheltering
deactivate Sheltering

Challenges -> Challenges: removeChallenge(sheltererId, bundleId)
activate Challenges
deactivate

Anybody <- Challenges: feeReturn
Anybody <-- Challenges
deactivate Challenges

@enduml
