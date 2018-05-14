@startuml

actor OldShelterer
actor NewShelterer

box "Smart Contracts" 	
  participant Transfers  
  participant Sheltering
  participant Fees
end box

== Create transfer ==

OldShelterer -> Fees: getFeeFor(time, TRANSFER)
activate Fees
OldShelterer <-- Fees
deactivate Fees

OldShelterer -> Transfers: transfer(bundleId, implicit oldSheltererId) payable (fee)
activate Transfers

Transfers -> Sheltering: isSheltering(oldSheltererId, bundleId)
activate Sheltering
Transfers <-- Sheltering
deactivate Sheltering

Transfers -> Fees: getFeeFor(time, TRANSFER)
activate Fees
Transfers <-- Fees
deactivate Fees

Transfers -> Transfers: tryStoreTransfer(oldSheltererId, bundleId, fee)
activate Transfers
deactivate Transfers
OldShelterer <-- Transfers
deactivate Transfers

== Resolve transfer ==

NewShelterer -> Transfers: resolve(oldSheltererId, bundleId, implicit newSheltererId)
activate Transfers

Transfers -> Sheltering: addSheltering(newSheltererId, bundleId)
activate Sheltering
Sheltering -> Sheltering: isSheltering(newSheltererId, bundleId)
activate Sheltering
deactivate Sheltering
Transfers <-- Sheltering
deactivate Sheltering

Transfers -> Sheltering: removeSheltering(oldSheltererId, bundleId)
activate Sheltering
Transfers <-- Sheltering
deactivate Sheltering

Transfers -> Transfers: removeTransfer(oldSheltererId, bundleId)
activate Transfers
deactivate Transfers
NewShelterer <- Transfers : fee
NewShelterer <-- Transfers
deactivate Transfers

@enduml


