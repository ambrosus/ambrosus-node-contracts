@startuml

Whitelist <|-- KycWhitelist
Ownable <|-- BundleStore

ContractRegistry ..> BundleContract
ContractRegistry ..> BundleStore
ContractRegistry ..> StakeContract
ContractRegistry ..> Challenger
ContractRegistry ..> FeeSpliter
BundleContract *-- BundleStore
StakeContract *-- KycWhitelist
Challenger *-- BundleContract

class StakeContract {
    depositStake(role) payable
    isAllowed(address, role): bool
}

class BundleStore {
    addBundle(bundleId, creator)
    getBundle(bundleId)
}

class Ownable {
    _onlyOwner()
    changeOwner()
}

class Whitelist {
    add()
    bool : isWhitelisted()
}

@enduml
