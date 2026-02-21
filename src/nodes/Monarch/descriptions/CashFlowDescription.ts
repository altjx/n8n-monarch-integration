import type { INodeProperties } from 'n8n-workflow';

export const cashFlowOperations: INodeProperties[] = [
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

export const cashFlowFields: INodeProperties[] = [
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
