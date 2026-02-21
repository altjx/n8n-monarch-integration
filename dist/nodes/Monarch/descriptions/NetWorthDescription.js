"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.netWorthFields = exports.netWorthOperations = void 0;
exports.netWorthOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['netWorth'] } },
        options: [
            {
                name: 'Get By Account Type',
                value: 'getByAccountType',
                description: 'Get net worth broken down by account type',
                action: 'Get net worth by account type',
            },
            {
                name: 'Get Snapshots',
                value: 'getSnapshots',
                description: 'Get daily aggregate net worth over time',
                action: 'Get net worth snapshots',
            },
        ],
        default: 'getSnapshots',
    },
];
exports.netWorthFields = [
    // --- Fields for getSnapshots ---
    {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: { show: { resource: ['netWorth'], operation: ['getSnapshots'] } },
        options: [
            {
                displayName: 'Start Date',
                name: 'startDate',
                type: 'dateTime',
                default: '',
                description: 'Start date for net worth snapshots',
            },
            {
                displayName: 'End Date',
                name: 'endDate',
                type: 'dateTime',
                default: '',
                description: 'End date for net worth snapshots',
            },
            {
                displayName: 'Account Type',
                name: 'accountType',
                type: 'string',
                default: '',
                description: 'Filter snapshots by account type',
            },
        ],
    },
    // --- Fields for getByAccountType ---
    {
        displayName: 'Start Date',
        name: 'startDate',
        type: 'dateTime',
        required: true,
        default: '',
        description: 'Start date for net worth by account type',
        displayOptions: { show: { resource: ['netWorth'], operation: ['getByAccountType'] } },
    },
    {
        displayName: 'Timeframe',
        name: 'timeframe',
        type: 'options',
        required: true,
        default: 'month',
        description: 'Granularity of the net worth breakdown',
        displayOptions: { show: { resource: ['netWorth'], operation: ['getByAccountType'] } },
        options: [
            {
                name: 'Monthly',
                value: 'month',
            },
            {
                name: 'Yearly',
                value: 'year',
            },
        ],
    },
];
//# sourceMappingURL=NetWorthDescription.js.map