@startuml

actor Wallet
actor Ambrosus

box "Smart Contracts" 	
	participant StakeContract
    participant KycWhitelist
end box

Ambrosus -> KycWhitelist: add(wallet) 
Wallet -> StakeContract: stake(role) payable
activate StakeContract
StakeContract -> KycWhitelist: isWhitelisted
Wallet <- StakeContract
deactivate StakeContract


@enduml
