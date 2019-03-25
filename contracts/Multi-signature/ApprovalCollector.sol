pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./MultiplexingContract.sol";


/**
 * @title ApprovalCollector smart contract
 * @dev Collects approvals for important transactions
 */
contract ApprovalCollector is Ownable {
    using SafeMath for uint256;

    //TODO: change to real multiplexing contract when it will be implemented
    MultiplexingContract private multiplexingContract;             //address of controlled contract
    uint256 constant TRANSACTION_LIFETIME = 300000;                // in seconds
    uint256 private transactionNonce = 0;

    enum TransactionClass {DEFAULT, CRITICAL}

    struct TransactionClassParams {
        uint neededApprovals;
        uint neededCriticalApprovals;
    }

    struct Transaction {
        mapping (address => bool) approvers;
        uint256 timestamp;
        uint arrayIndex;    //index in array of pending transactions

        TransactionClassParams classParams;

        bytes4 selector;    //unction selector
        bytes args;         //encoded arguments
    }

    bytes32[] pendingTransactions;
    mapping (bytes32 => Transaction) private transactions;

    mapping (address => bool) private administrators;
    mapping (address => bool) private criticalAdministrators;

    mapping (bytes4 => TransactionClass) private transactionClass;
    mapping (uint => TransactionClassParams) private transactionClassParams;

    ////////////////////////////////////////////////////////////////////////////////////
    event TransactionCreated(bytes32 transactionId);
    event ApprovalReceived(address from, bytes32 transactionId);
    event AllApprovalsReceived(bytes32 transactionId);
    event TransactionExecuted(bytes32 transactionId, bytes result);
    ////////////////////////////////////////////////////////////////////////////////////

    modifier onlyAdmin() {
        require (administrators[msg.sender], "Approver address is not administrator");
        _;
    }

    modifier onlyCriticalAdmin() {
        require (criticalAdministrators[msg.sender], "Approver address is not critical administrator");
        _;
    }

    constructor (MultiplexingContract _multiplexingContract) public {
        addCriticalAdministrator(msg.sender);

        transactionClassParams[uint(TransactionClass.DEFAULT)].neededApprovals = 2;
        transactionClassParams[uint(TransactionClass.DEFAULT)].neededCriticalApprovals = 0;

        transactionClassParams[uint(TransactionClass.CRITICAL)].neededApprovals = 3;
        transactionClassParams[uint(TransactionClass.CRITICAL)].neededCriticalApprovals = 1;

        multiplexingContract = _multiplexingContract;
    }

    /**
     * @dev Adding transaction for approve
     * @param selector Target function selector
     * @param args Encoded function arguments
     * @return identifier of new transaction that should be approved
     */
    function addTransaction(bytes4 selector, bytes memory args) public {
        bytes32 transactionId = _calculateTransactionId(selector, args);

        require(transactions[transactionId].timestamp == 0, "Transaction already exists");

        transactions[transactionId].timestamp = now;
        transactions[transactionId].args = args;
        transactions[transactionId].selector = selector;

        transactions[transactionId].classParams = transactionClassParams[uint(transactionClass[selector])];

        pendingTransactions.push(transactionId);
        transactions[transactionId].arrayIndex = pendingTransactions.length - 1;

        transactionNonce = transactionNonce.add(1);
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
        require(transactions[transactionId].timestamp != 0, "Transaction doesn\'t exist or was already performed");
        require((now - transactions[transactionId].timestamp) <= TRANSACTION_LIFETIME, "Transaction timeout");

        transactions[transactionId].approvers[msg.sender] = true;

        if (transactions[transactionId].classParams.neededApprovals > 0) {
            transactions[transactionId].classParams.neededApprovals = transactions[transactionId].classParams.neededApprovals.sub(1);
        }

        if (transactions[transactionId].classParams.neededCriticalApprovals > 0 && criticalAdministrators[msg.sender]) {
            transactions[transactionId].classParams.neededCriticalApprovals = transactions[transactionId].classParams.neededCriticalApprovals.sub(1);
        }

        emit ApprovalReceived(msg.sender, transactionId);

        if (transactions[transactionId].classParams.neededApprovals == 0 && transactions[transactionId].classParams.neededCriticalApprovals == 0) {
            emit AllApprovalsReceived(transactionId);
            _removePendingTransaction(transactionId);
            transactions[transactionId].timestamp = 0;
            bytes memory data = multiplexingContract.performTransaction(transactions[transactionId].selector, transactions[transactionId].args);
            emit TransactionExecuted(transactionId, data);
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
        return pendingTransactions;
    }

    /**
     * @dev Function for obtaining pending transaction details
     * @param transactionId Identifier of transaction
     * @return address of contract, that should execute transaction and encoded function selector and parameters
     */
    function getTransactionInfo(bytes32 transactionId) public view returns (bytes4, bytes memory, uint, uint) {
        return (
            transactions[transactionId].selector,
            transactions[transactionId].args,
            transactions[transactionId].classParams.neededApprovals,
            transactions[transactionId].classParams.neededCriticalApprovals
        );
    }

    /**
     * @dev Add new administrator, can be performed only by critical administrator
     * @param newAdmin New administrator address
     */
    function addAdministrator(address newAdmin) public onlyCriticalAdmin {
        administrators[newAdmin] = true;
    }

    /**
     * @dev Delete administrator, can be performed only by critical administrator
     * @param admin Administrator address
     */
    function deleteAdministrator(address admin) public onlyCriticalAdmin {
        administrators[admin] = false;
    }

    /**
     * @dev Add new critical administrator, can be performed only by contract owner
     * @param newAdmin New administrator address
     */
    function addCriticalAdministrator(address newAdmin) public onlyOwner {
        administrators[newAdmin] = true;
        criticalAdministrators[newAdmin] = true;
    }

    /**
     * @dev Delete critical administrator, can be performed only by contract owner
     * @param admin Administrator address
     */
    function deleteCriticalAdministrator(address admin) public onlyOwner {
        administrators[admin] = false;
        criticalAdministrators[admin] = false;
    }

    /**
     * @dev Set transaction class
     * @param targetTransaction target function selector
     * @param class Enum, defines how many approves of each types needed for performing transaction
     */
    function setTransactionClass(bytes4 targetTransaction, TransactionClass class) public onlyCriticalAdmin {
        transactionClass[targetTransaction] = class;
    }

    /**
     * @dev Obtain multiplexing contract address
     */
    function getMultiplexingContract() public view returns (MultiplexingContract) {
        return multiplexingContract;
    }

    /**
     * @dev Update multiplexing contract address
     */
    function updateMultiplexingContract(MultiplexingContract _multiplexingContract) public onlyOwner {
        multiplexingContract = _multiplexingContract;
    }

    /**
     * @dev Checks is account approved transaction
     * @param approver Address of account
     * @param transactionId Identifier of transaction
     * @return true if approver approved transaction with transactionId, and false if not
     */
    function _hasApproved(address approver, bytes32 transactionId) internal view returns (bool) {
        return transactions[transactionId].approvers[approver];
    }

    /**
     * @dev Internal function for removing transaction from list of pending transactions
     * @dev Replaces transaction with given identifier with last transaction from array of pending transactions
     * @param transactionId Identifier of transaction to remove
     */
    function _removePendingTransaction(bytes32 transactionId) internal {
        uint index = transactions[transactionId].arrayIndex;
        pendingTransactions[index] = pendingTransactions[pendingTransactions.length - 1];
        transactions[pendingTransactions[index]].arrayIndex = index;
        delete pendingTransactions[pendingTransactions.length - 1];
        --pendingTransactions.length;
    }

    /**
     * @dev Calculate transaction id based on target selector, arguments and nonce
     */
    function _calculateTransactionId(bytes4 selector, bytes args) internal returns (bytes32) {
        return keccak256(abi.encodePacked(transactionNonce, selector, args));
    }
}