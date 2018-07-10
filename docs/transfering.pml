@startuml

actor OldShelterer
actor NewShelterer

box "Smart Contracts" 	
  participant ShelteringTransfers  
  participant Sheltering
end box

== Create transfer ==

OldShelterer -> ShelteringTransfers: start(bundleId, implicit donorId)
activate ShelteringTransfers

ShelteringTransfers -> Sheltering: isSheltering(donorId, bundleId)
activate Sheltering
ShelteringTransfers <-- Sheltering
deactivate Sheltering

ShelteringTransfers -> ShelteringTransfers: validateTransfer(donorId, bundleId)
activate ShelteringTransfers
deactivate ShelteringTransfers

ShelteringTransfers -> ShelteringTransfers: store(donorId, bundleId)
activate ShelteringTransfers
deactivate ShelteringTransfers
OldShelterer <-- ShelteringTransfers
deactivate ShelteringTransfers

== Resolve transfer ==

NewShelterer -> ShelteringTransfers: resolve(donorId, bundleId, implicit newSheltererId)
activate ShelteringTransfers

ShelteringTransfers -> Sheltering: addSheltering(newSheltererId, bundleId)
activate Sheltering
Sheltering -> Sheltering: isSheltering(newSheltererId, bundleId)
activate Sheltering
deactivate Sheltering
ShelteringTransfers <-- Sheltering
deactivate Sheltering

ShelteringTransfers -> Sheltering: removeSheltering(donorId, bundleId)
activate Sheltering
ShelteringTransfers <-- Sheltering
deactivate Sheltering

ShelteringTransfers -> ShelteringTransfers: removeTransfer(donorId, bundleId)
activate ShelteringTransfers
deactivate ShelteringTransfers
NewShelterer <- ShelteringTransfers : fee
NewShelterer <-- ShelteringTransfers
deactivate ShelteringTransfers

@enduml


