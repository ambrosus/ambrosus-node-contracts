@startuml

title Challenging

actor Anybody
actor Atlas

box "Smart Contracts" 	
	participant Challenges
  participant Sheltering
  participant StakeContract
  participant Fees
  participant Payout
end box

== Start a challenge ==

Anybody -> Fees: getFeeFor(time, CHALLENGE)
activate Fees
Anybody <-- Fees
deactivate Fees

Anybody -> Challenges: start(sheltererId, bundleId, implicit challengerId) payable
activate Challenges

Challenges -> Challenges: inProgress(sheltererId, bundleId)
activate Challenges
deactivate Challenges

Challenges -> Sheltering: isSheltering(sheltererId, bundleId)
activate Sheltering
Challenges <-- Sheltering
deactivate Sheltering

Challenges -> Fees: getFeeFor(time, CHALLENGE)
activate Fees
Challenges <-- Fees
deactivate Fees

Challenges -> Challenges: storeChallenge(sheltererId, bundleId, challengerId, fee, 1)
note right: sets active count to 1
activate Challenges
deactivate Challenges

Anybody <-- Challenges
deactivate Challenges

== Start a System challenge  ==

Anybody -> Fees: getFeeFor(time, CHALLENGE)
activate Fees
Anybody <-- Fees
deactivate Fees

Anybody -> Challenges: startForSystem(sheltererId, bundleId, numChallenges) payable onlyInternal
activate Challenges

Challenges -> Challenges: inProgress(sheltererId, bundleId)
activate Challenges
deactivate Challenges

Challenges -> Sheltering: isSheltering(sheltererId, bundleId)
activate Sheltering
Challenges <-- Sheltering
deactivate Sheltering

Challenges -> Fees: getFeeFor(time, CHALLENGE)
activate Fees
Challenges <-- Fees
deactivate Fees

Challenges -> Challenges: storeChallenge(sheltererId, bundleId, 0x0, fee, numChallenges)
note right: sets active count to numChallenges
activate Challenges
deactivate Challenges

Anybody <-- Challenges
deactivate Challenges

== Resolve a challenge ==

Atlas -> Challenges: resolve(sheltererId, bundleId, implicit atlasId)
activate Challenges

Challenges -> Challenges: inProgress(sheltererId, bundleId)
activate Challenges
deactivate Challenges

Challenges -> Sheltering: isSheltering(atlasId, bundleId)
activate Sheltering
Challenges <-- Sheltering
deactivate Sheltering


Challenges -> Sheltering: addSheltering(atlasId, bundleId)
activate Sheltering
Challenges <-- Sheltering
deactivate Sheltering

Challenges -> Payout: grantChallengeResolutionReward(beneficiaryId, bundleId) payable
activate Payout
Challenges <-- Payout
deactivate Payout

Challenges -> Challenges: removeChallenge(atlasId, bundleId)
note right: decrements active count by 1
activate Challenges
deactivate Challenges
Atlas <-- Challenges
deactivate Challenges

== Reject a challenge (timeout) ==

Anybody -> Challenges: timeout(sheltererId, bundleId, implicit challengerId)
activate Challenges

Challenges -> Challenges: inProgress(sheltererId, bundleId)
activate Challenges
deactivate Challenges

Challenges -> Challenges: didTimeout(sheltererId, bundleId)
activate Challenges
deactivate Challenges

Challenges -> Fees: calculatePenalty(sheltererId, n)
activate Fees
Challenges<-- Fees
deactivate Fees

Challenges -> StakeContract: slash(sheltererId, challengerId, amount)
activate StakeContract
Anybody <- StakeContract: reward
Challenges <-- StakeContract
deactivate StakeContract

Challenges -> Payout: revokeChallengeResolutionReward(beneficiaryId, bundleId, refundAddress)
activate Payout
Challenges <-- Payout
deactivate Payout

Challenges -> Sheltering: removeSheltering(sheltererId, bundleId)
activate Sheltering
Challenges <-- Sheltering
deactivate Sheltering

Challenges -> Challenges: removeChallenge(sheltererId, bundleId)
note right: resets active count to 0
activate Challenges
deactivate

Anybody <- Challenges: feeReturn
Anybody <-- Challenges
deactivate Challenges

@enduml
