"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionFields = exports.transactionOperations = void 0;
exports.transactionOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['transaction'] } },
        options: [
            {
                name: 'Get Many',
                value: 'getMany',
                description: 'Get a paginated list of transactions',
                action: 'Get many transactions',
            },
            {
                name: 'Get Summary',
                value: 'getSummary',
                description: 'Get aggregate transaction statistics',
                action: 'Get transaction summary',
            },
            {
                name: 'Update',
                value: 'update',
                description: 'Update details of an existing transaction',
                action: 'Update a transaction',
            },
        ],
        default: 'getMany',
    },
];
exports.transactionFields = [
    // -------------------------------------------------------------------------
    // getMany fields
    // -------------------------------------------------------------------------
    // Limit
    {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 100,
        typeOptions: { minValue: 1 },
        description: 'Max number of results to return',
        displayOptions: { show: { resource: ['transaction'], operation: ['getMany'] } },
    },
    // Offset
    {
        displayName: 'Offset',
        name: 'offset',
        type: 'number',
        default: 0,
        description: 'Number of transactions to skip for pagination',
        displayOptions: { show: { resource: ['transaction'], operation: ['getMany'] } },
    },
    // Filters
    {
        displayName: 'Filters',
        name: 'filters',
        type: 'collection',
        placeholder: 'Add Filter',
        default: {},
        displayOptions: { show: { resource: ['transaction'], operation: ['getMany'] } },
        options: [
            {
                displayName: 'Start Date',
                name: 'startDate',
                type: 'dateTime',
                default: '',
                description: 'Only return transactions on or after this date',
            },
            {
                displayName: 'End Date',
                name: 'endDate',
                type: 'dateTime',
                default: '',
                description: 'Only return transactions on or before this date',
            },
            {
                displayName: 'Search',
                name: 'search',
                type: 'string',
                default: '',
                description: 'Search query to filter transactions',
            },
            {
                displayName: 'Has Attachments',
                name: 'hasAttachments',
                type: 'boolean',
                default: false,
                description: 'Whether to filter transactions that have attachments',
            },
            {
                displayName: 'Has Notes',
                name: 'hasNotes',
                type: 'boolean',
                default: false,
                description: 'Whether to filter transactions that have notes',
            },
            {
                displayName: 'Is Recurring',
                name: 'isRecurring',
                type: 'boolean',
                default: false,
                description: 'Whether to filter recurring transactions',
            },
            {
                displayName: 'Is Split',
                name: 'isSplit',
                type: 'boolean',
                default: false,
                description: 'Whether to filter split transactions',
            },
        ],
    },
    // -------------------------------------------------------------------------
    // update fields
    // -------------------------------------------------------------------------
    // Transaction ID
    {
        displayName: 'Transaction ID',
        name: 'transactionId',
        type: 'string',
        required: true,
        default: '',
        description: 'The ID of the transaction to update',
        displayOptions: { show: { resource: ['transaction'], operation: ['update'] } },
    },
    // Update Fields collection
    {
        displayName: 'Update Fields',
        name: 'updateFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: { show: { resource: ['transaction'], operation: ['update'] } },
        options: [
            {
                displayName: 'Amount',
                name: 'amount',
                type: 'number',
                default: 0,
                typeOptions: { numberPrecision: 2 },
                description: 'The transaction amount',
            },
            {
                displayName: 'Category ID',
                name: 'categoryId',
                type: 'string',
                default: '',
                description: 'The ID of the category to assign to this transaction',
            },
            {
                displayName: 'Date',
                name: 'date',
                type: 'dateTime',
                default: '',
                description: 'The date of the transaction (YYYY-MM-DD)',
            },
            {
                displayName: 'Goal ID',
                name: 'goalId',
                type: 'string',
                default: '',
                description: 'The ID of the goal to associate with this transaction. Use an empty string to clear.',
            },
            {
                displayName: 'Hide from Reports',
                name: 'hideFromReports',
                type: 'boolean',
                default: false,
                description: 'Whether to hide this transaction from reports',
            },
            {
                displayName: 'Merchant Name',
                name: 'merchantName',
                type: 'string',
                default: '',
                description: 'The merchant name for this transaction. Empty strings are ignored by the API.',
            },
            {
                displayName: 'Needs Review',
                name: 'needsReview',
                type: 'boolean',
                default: false,
                description: 'Whether this transaction needs review',
            },
            {
                displayName: 'Notes',
                name: 'notes',
                type: 'string',
                default: '',
                description: 'Notes for this transaction. Use an empty string to clear existing notes.',
            },
        ],
    },
];
//# sourceMappingURL=TransactionDescription.js.map