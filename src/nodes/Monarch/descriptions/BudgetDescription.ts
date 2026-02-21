import type { INodeProperties } from 'n8n-workflow';

export const budgetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['budget'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many budgets with planned vs actual amounts',
				action: 'Get many budgets',
			},
		],
		default: 'getAll',
	},
];

export const budgetFields: INodeProperties[] = [
	// Additional Fields — shown for getAll
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['budget'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description: 'Start month for budget period (defaults to last month if omitted)',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description: 'End month for budget period (defaults to next month if omitted)',
			},
		],
	},
];
