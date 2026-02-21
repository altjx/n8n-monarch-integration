import type { INodeProperties } from 'n8n-workflow';

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['account'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many accounts with balances',
				action: 'Get many accounts',
			},
			{
				name: 'Get History',
				value: 'getHistory',
				description: 'Get daily balance history for an account',
				action: 'Get account history',
			},
		],
		default: 'getAll',
	},
];

export const accountFields: INodeProperties[] = [
	// Account ID — required for getHistory
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the account to get history for',
		displayOptions: { show: { resource: ['account'], operation: ['getHistory'] } },
	},
];
