@startuml

actor HermesNode

HermesNode -> BundleContract: registerBundle

activate BundleContract
BundleContract -> StakeContract: isWhitelisted
BundleContract <- StakeContract
BundleContract -> Challenger: startChallanges(n)
BundleContract <- Challenger
BundleContract -> BundleStore: storeBundle(...)
BundleContract <- BundleStore
BundleContract -> FeeSpliter: splitFee()
BundleContract <- FeeSpliter

deactivate BundleContract

box "Smart Contracts" 	
	participant BundleContract
  participant StakeContract
  participant Challenger
  participant BundleStore
  participant FeeSpliter
end box

@enduml
