@startuml

actor OldShelterer
actor NewShelterer

box "Smart Contracts" 	
  participant ShelteringTransfers  
  participant Sheltering
end box

== Create transfer ==

OldShelterer -> ShelteringTransfers: transfer(bundleId, implicit sheltererFromId)
activate ShelteringTransfers

ShelteringTransfers -> Sheltering: isSheltering(sheltererFromId, bundleId)
activate Sheltering
ShelteringTransfers <-- Sheltering
deactivate Sheltering

ShelteringTransfers -> ShelteringTransfers: validateTransfer(sheltererFromId, bundleId)
activate ShelteringTransfers
deactivate ShelteringTransfers

ShelteringTransfers -> ShelteringTransfers: store(sheltererFromId, bundleId)
activate ShelteringTransfers
deactivate ShelteringTransfers
OldShelterer <-- ShelteringTransfers
deactivate ShelteringTransfers

== Resolve transfer ==

NewShelterer -> ShelteringTransfers: resolve(sheltererFromId, bundleId, implicit newSheltererId)
activate ShelteringTransfers

ShelteringTransfers -> Sheltering: addSheltering(newSheltererId, bundleId)
activate Sheltering
Sheltering -> Sheltering: isSheltering(newSheltererId, bundleId)
activate Sheltering
deactivate Sheltering
ShelteringTransfers <-- Sheltering
deactivate Sheltering

ShelteringTransfers -> Sheltering: removeSheltering(sheltererFromId, bundleId)
activate Sheltering
ShelteringTransfers <-- Sheltering
deactivate Sheltering

ShelteringTransfers -> ShelteringTransfers: removeTransfer(sheltererFromId, bundleId)
activate ShelteringTransfers
deactivate ShelteringTransfers
NewShelterer <- ShelteringTransfers : fee
NewShelterer <-- ShelteringTransfers
deactivate ShelteringTransfers

@enduml


