@startuml

title Uploading

actor HermesNode

HermesNode -> Fees: getFeeFor(time, UPLOAD)
activate Fees
HermesNode <-- Fees
deactivate Fees

HermesNode -> Uploads: registerBundle(bundleId, time, implicit creatorId) payable
activate Uploads

Uploads -> Fees: getFeeFor(time, UPLOAD)
activate Fees
Uploads <-- Fees
deactivate Fees

Uploads -> Sheltering: store(bundleId, creatorId)
activate Sheltering
Sheltering -> Sheltering: exist(bundleId)
activate Sheltering
deactivate Sheltering

Sheltering -> StakeStore: canStore(creatorId)
activate StakeStore
Sheltering <- StakeStore
deactivate StakeStore

Sheltering -> Sheltering: addSheltering(bundleId, creatorId)
Uploads <-- Sheltering
deactivate Sheltering

Uploads -> Challenges: startForSystem(creatorId, bundleId, numChallenges) payable
activate Challenges
Uploads <-- Challenges
deactivate Challenges

Uploads -> Fees: splitFee() payable
activate Fees
Uploads <-- Fees
deactivate Fees

HermesNode <-- Uploads
deactivate Uploads

box "Smart Contracts" 	
	participant Uploads
  participant Sheltering
  participant SheltererStorage
  participant Fees
  participant Challenges
  participant StakeStore
end box

@enduml
