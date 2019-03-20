pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./MultiplexingContract.sol";


/**
 * @title DelegateERC20 smart contract
 * @dev Controls execution of ERC20 token transactions
 */
contract ApprovalCollector is Ownable {
    using SafeMath for uint256;

    MultiplexingContract private multiplexingContract;             //address of controlled contract
    uint256 constant CALL_LIFETIME = 300000;    //transaction lifetime in seconds
    uint256 private _transactionNonce = 0;

    enum ContractClass {DEFAULT, CRITICAL}

    struct ContractClassParams {
        uint neededApprovals;
        uint neededCriticalApprovals;
    }

    struct Transaction {
        mapping (address => bool) approvers;
        uint256 timestamp;
        uint arrayIndex;    //index in array of pending transactions

        ContractClassParams classParams;

        bytes transaction;  //function selector + encoded arguments
        address executor;   //contract, that should perform call
    }

    bytes32[] _pendingTransactions;
    mapping (bytes32 => Transaction) private _transactions;

    mapping (address => bool) private _administrators;
    mapping (address => bool) private _criticalApprovers;

    mapping (address => ContractClass) private _contractClass;
    mapping (uint => ContractClassParams) private _contractClassParams;

    ////////////////////////////////////////////////////////////////////////////////////
    event TransactionCreated(bytes32 transactionId);                            //new transaction created
    event ApprovalReceived(address from, bytes32 transactionId);                //received approval
    event AllApprovalsReceived(bytes32 transactionId);
    ////////////////////////////////////////////////////////////////////////////////////

    modifier onlyAdmin()
    {
        require ((_administrators[msg.sender] || _criticalApprovers[msg.sender]), "Approver address is not administrator");
        _;
    }

    constructor (MultiplexingContract _multiplexingContract) public {
        _criticalApprovers[msg.sender] = true;

        _contractClassParams[uint(ContractClass.DEFAULT)].neededApprovals = 2;
        _contractClassParams[uint(ContractClass.DEFAULT)].neededCriticalApprovals = 0;

        _contractClassParams[uint(ContractClass.CRITICAL)].neededApprovals = 3;
        _contractClassParams[uint(ContractClass.CRITICAL)].neededCriticalApprovals = 1;

        multiplexingContract = _multiplexingContract;
    }

    /**
     * @dev Adding transaction for approve
     *
     * @param executor Address of contract that should execute transaction
     * @param transaction encoded function selector and parameters
     * @return identifier of new transaction that should be approved
     */
    function executeTransaction( address executor, bytes memory transaction) public {
        bytes32 transactionId = keccak256(abi.encodePacked(executor, _transactionNonce, transaction));

        require(_transactions[transactionId].timestamp == 0, "Transaction already exists");

        _transactions[transactionId].timestamp = now;
        _transactions[transactionId].executor = executor;
        _transactions[transactionId].transaction = transaction;

        _transactions[transactionId].classParams = _contractClassParams[uint(_contractClass[executor])];

        _pendingTransactions.push(transactionId);
        _transactions[transactionId].arrayIndex = _pendingTransactions.length - 1;

        _transactionNonce = _transactionNonce.add(1);
        emit TransactionCreated(transactionId);
    }

    /**
     * @dev Function for approving transaction. If this is a last needed approval that executes transaction
     * Reverts if sender hasn't permission to approve transaction, transaction isn't exists or already performed,
     * transaction timeout or transaction already approved
     *
     * @param transactionId Identifier of transaction to approve
     */
    function approveTransaction(bytes32 transactionId) public onlyAdmin {
        require(!_hasApproved(msg.sender, transactionId), "Transaction already approved");
        require(_transactions[transactionId].timestamp != 0, "Transaction isn\'t exist or already performed");
        require((now - _transactions[transactionId].timestamp) <= CALL_LIFETIME, "Transaction timeout");

        _transactions[transactionId].approvers[msg.sender] = true;

        if (_transactions[transactionId].classParams.neededApprovals > 0) {
            _transactions[transactionId].classParams.neededApprovals = _transactions[transactionId].classParams.neededApprovals.sub(1);
        }

        if (_transactions[transactionId].classParams.neededCriticalApprovals > 0 && _criticalApprovers[msg.sender]) {
            _transactions[transactionId].classParams.neededCriticalApprovals = _transactions[transactionId].classParams.neededCriticalApprovals.sub(1);
        }

        emit ApprovalReceived(msg.sender, transactionId);

        if (_transactions[transactionId].classParams.neededApprovals == 0 && _transactions[transactionId].classParams.neededCriticalApprovals == 0) {
            emit AllApprovalsReceived(transactionId);
            _removePendingTransaction(transactionId);
            _transactions[transactionId].timestamp = 0;
            multiplexingContract.performTransaction(_transactions[transactionId].executor, _transactions[transactionId].transaction);
        }
    }

    /**
     * @dev Checks is account approved transaction
     * @param approver Address of account
     * @dev approver must have permission for approving
     * @param transactionId Identifier of transaction
     * @return true if approver approved transaction with transactionId, and false if not
     */
    function hasApproved(address approver, bytes32 transactionId) public view onlyAdmin returns (bool) {
        return _hasApproved(approver, transactionId);
    }

    /**
     * @dev Function for obtaining pending transactions
     * @return array with pending transaction identifiers
     */
    function getPendingTransactions() public view returns (bytes32[] memory) {
        return _pendingTransactions;
    }

    /**
     * @dev Function for obtaining pending transaction details
     * @param transactionId Identifier of transaction
     * @return address of contract, that should execute transaction and encoded function selector and parameters
     */
    function getTransactionInfo(bytes32 transactionId) public view returns (address, bytes memory, uint, uint) {
        return (
            _transactions[transactionId].executor,
            _transactions[transactionId].transaction,
            _transactions[transactionId].classParams.neededApprovals,
            _transactions[transactionId].classParams.neededCriticalApprovals
        );
    }

    function addAdministrator(address newAdmin) public {
        require(_criticalApprovers[msg.sender]);
        _administrators[newAdmin] = true;
    }

    function deleteAdministrator(address approver) public {
        require(_criticalApprovers[msg.sender]);
        _administrators[approver] = false;
    }

    function addCriticalApprover(address newApprover) public onlyOwner {
        _criticalApprovers[newApprover] = true;
    }

    function deleteCriticalApprover(address approver) public onlyOwner {
        _administrators[approver] = false;
    }

    function setContractClass(address _contract, ContractClass class) public onlyAdmin {
        _contractClass[_contract] = class;
    }

    /**
     * @dev Function for getting current controlled contract
     */
    function getMultiplexingContract() public view returns (MultiplexingContract) {
        return multiplexingContract;
    }

    function updateMultiplexingContract(MultiplexingContract newContractAddress) public onlyOwner {
        multiplexingContract = newContractAddress;
    }

    /**
     * @dev Checks is account approved transaction
     * @param approver Address of account
     * @param transactionId Identifier of transaction
     * @return true if approver approved transaction with transactionId, and false if not
     */
    function _hasApproved(address approver, bytes32 transactionId) internal view returns (bool) {
        return _transactions[transactionId].approvers[approver];
    }

    /**
     * @dev Internal function for removing transaction from list of pending transactions
     * @dev Replaces transaction with given identifier with last transaction from array of pending transactions
     * @param transactionId Identifier of transaction to remove
     */
    function _removePendingTransaction(bytes32 transactionId) internal {
        uint index = _transactions[transactionId].arrayIndex;
        _pendingTransactions[index] = _pendingTransactions[_pendingTransactions.length - 1];
        _transactions[_pendingTransactions[index]].arrayIndex = index;
        delete _pendingTransactions[_pendingTransactions.length - 1];
        --_pendingTransactions.length;
    }
}