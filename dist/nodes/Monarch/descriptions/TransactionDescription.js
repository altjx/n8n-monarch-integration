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
        ],
        default: 'getMany',
    },
];
exports.transactionFields = [
    // Limit — shown for getMany
    {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 100,
        typeOptions: { minValue: 1 },
        description: 'Max number of results to return',
        displayOptions: { show: { resource: ['transaction'], operation: ['getMany'] } },
    },
    // Offset — shown for getMany
    {
        displayName: 'Offset',
        name: 'offset',
        type: 'number',
        default: 0,
        description: 'Number of transactions to skip for pagination',
        displayOptions: { show: { resource: ['transaction'], operation: ['getMany'] } },
    },
    // Filters — shown for getMany
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
];
//# sourceMappingURL=TransactionDescription.js.map