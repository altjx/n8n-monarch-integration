"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cashFlowFields = exports.cashFlowOperations = void 0;
exports.cashFlowOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['cashFlow'] } },
        options: [
            {
                name: 'Get Summary',
                value: 'getSummary',
                description: 'Get income, expense, and savings by period',
                action: 'Get cash flow summary',
            },
        ],
        default: 'getSummary',
    },
];
exports.cashFlowFields = [
    // Start Date — required for getSummary
    {
        displayName: 'Start Date',
        name: 'startDate',
        type: 'dateTime',
        required: true,
        default: '',
        description: 'Start date for cash flow period (YYYY-MM-DD)',
        displayOptions: { show: { resource: ['cashFlow'], operation: ['getSummary'] } },
    },
    // End Date — required for getSummary
    {
        displayName: 'End Date',
        name: 'endDate',
        type: 'dateTime',
        required: true,
        default: '',
        description: 'End date for cash flow period (YYYY-MM-DD)',
        displayOptions: { show: { resource: ['cashFlow'], operation: ['getSummary'] } },
    },
];
//# sourceMappingURL=CashFlowDescription.js.map