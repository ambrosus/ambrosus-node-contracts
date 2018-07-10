@startuml

title Deploy

actor Deployer

box "Smart Contracts" 	
	participant Head
  participant Context  
  participant BundleStore
  participant Roles
  participant Fees
  participant StakeStore
  participant KycWhitelist
  participant ShelteringTransfers
  participant Challenges
  participant Sheltering
  participant BundleStore
  participant StakeStore
  participant Uploads
  participant Stakes  
end box

== deploy ==

Deployer -> Head: new()
Deployer -> Roles: new(head)
Deployer -> Fees: new(head)
Deployer -> KycWhitelist: new(head)
Deployer -> ShelteringTransfers: new(head)
Deployer -> Challenges: new(head)
Deployer -> Sheltering: new(head)
Deployer -> BundleStore: new(head)
Deployer -> StakeStore: new(head)
Deployer -> Uploads: new(head)
Deployer -> Stakes: new(head)

Deployer -> Context: new(roles, ..., stakes)
Deployer -> Head: setContext(context)

== Calling dependencies (example) ==
Deployer -> Head: context()
Deployer -> Context: sheltering()
Deployer -> Sheltering: method(...args)
activate Sheltering
Sheltering -> Context: canCall(msg.sender)
deactivate Sheltering

@enduml
