import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IExecuteFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	accountOperations,
	accountFields,
	transactionOperations,
	transactionFields,
	cashFlowOperations,
	cashFlowFields,
	budgetOperations,
	budgetFields,
	netWorthOperations,
	netWorthFields,
} from './descriptions';
import { monarchCredentialTest, monarchLogin, monarchRequest } from './GenericFunctions';

// ---------------------------------------------------------------------------
// GraphQL queries
// ---------------------------------------------------------------------------

const GET_ACCOUNTS = `query GetAccounts {
  accounts {
    id
    displayName
    syncDisabled
    deactivatedAt
    isHidden
    isAsset
    mask
    createdAt
    updatedAt
    displayLastUpdatedAt
    currentBalance
    displayBalance
    includeInNetWorth
    hideFromList
    hideTransactionsFromReports
    includeBalanceInNetWorth
    includeInGoalBalance
    dataProvider
    dataProviderAccountId
    isManual
    transactionsCount
    holdingsCount
    manualInvestmentsTrackingMethod
    order
    logoUrl
    type {
      name
      display
      __typename
    }
    subtype {
      name
      display
      __typename
    }
    credential {
      id
      updateRequired
      disconnectedFromDataProviderAt
      dataProvider
      institution {
        id
        plaidInstitutionId
        name
        status
        __typename
      }
      __typename
    }
    institution {
      id
      name
      primaryColor
      url
      __typename
    }
    __typename
  }
  householdPreferences {
    id
    accountGroupOrder
    __typename
  }
}`;

const GET_ACCOUNT_HISTORY = `query GetAccountHistory($accountId: UUID!) {
  accountHistory: snapshotsForAccount(accountId: $accountId) {
    date
    signedBalance
    __typename
  }
}`;

const GET_TRANSACTIONS_LIST = `query GetTransactionsList($offset: Int, $limit: Int, $filters: TransactionFilterInput, $orderBy: TransactionOrdering) {
  allTransactions(filters: $filters) {
    totalCount
    results(offset: $offset, limit: $limit, orderBy: $orderBy) {
      id
      amount
      pending
      date
      hideFromReports
      plaidName
      notes
      isRecurring
      reviewStatus
      needsReview
      isSplitTransaction
      createdAt
      updatedAt
      category {
        id
        name
        __typename
      }
      merchant {
        name
        id
        transactionsCount
        __typename
      }
      account {
        id
        displayName
        __typename
      }
      tags {
        id
        name
        color
        order
        __typename
      }
      __typename
    }
    __typename
  }
}`;

const GET_TRANSACTIONS_PAGE = `query GetTransactionsPage($filters: TransactionFilterInput) {
  aggregates(filters: $filters) {
    summary {
      avg
      count
      max
      maxExpense
      sum
      sumIncome
      sumExpense
      first
      last
      __typename
    }
    __typename
  }
}`;

const GET_CASHFLOW_SUMMARY = `query GetCashflowSummary($startDate: Date!, $endDate: Date!) {
  summary: cashflowSummary(startDate: $startDate, endDate: $endDate) {
    sumIncome
    sumExpense
    savings
    savingsRate
    __typename
  }
}`;

const GET_JOINT_PLANNING_DATA = `query Common_GetJointPlanningData($startDate: Date!, $endDate: Date!) {
  budgetData(startMonth: $startDate, endMonth: $endDate) {
    totalsByMonth {
      month
      totalIncome {
        actualAmount
        plannedAmount
        remainingAmount
        __typename
      }
      totalExpenses {
        actualAmount
        plannedAmount
        remainingAmount
        __typename
      }
      __typename
    }
    __typename
  }
  categoryGroups {
    id
    name
    type
    budgetVariability
    groupLevelBudgetingEnabled
    categories {
      id
      name
      icon
      budgetVariability
      excludeFromBudget
      __typename
    }
    __typename
  }
}`;

const GET_AGGREGATE_SNAPSHOTS = `query GetAggregateSnapshots($filters: AggregateSnapshotFilters) {
  aggregateSnapshots(filters: $filters) {
    date
    balance
    __typename
  }
}`;

const GET_SNAPSHOTS_BY_ACCOUNT_TYPE = `query GetSnapshotsByAccountType($startDate: Date!, $timeframe: Timeframe!) {
  snapshotsByAccountType(startDate: $startDate, timeframe: $timeframe) {
    accountType
    month
    balance
    __typename
  }
}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract just the YYYY-MM-DD portion from a dateTime string or ISO date. */
function toDateString(value: string): string {
	return value.toString().slice(0, 10);
}

/** Return the first day of the month that is `offsetMonths` away from today. */
function monthOffset(offsetMonths: number): string {
	const d = new Date();
	d.setDate(1);
	d.setMonth(d.getMonth() + offsetMonths);
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	return `${yyyy}-${mm}-01`;
}

/** Return the last day of the month that is `offsetMonths` away from today. */
function lastDayOfMonthOffset(offsetMonths: number): string {
	const d = new Date();
	d.setDate(1);
	d.setMonth(d.getMonth() + offsetMonths + 1);
	d.setDate(0); // last day of previous month
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Node
// ---------------------------------------------------------------------------

export class Monarch implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Monarch Money',
		name: 'monarch',
		icon: 'file:monarch.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with your Monarch Money account',
		defaults: { name: 'Monarch Money' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'monarchApi', required: true, testedBy: 'monarchCredentialTest' }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Budget', value: 'budget' },
					{ name: 'Cash Flow', value: 'cashFlow' },
					{ name: 'Net Worth', value: 'netWorth' },
					{ name: 'Transaction', value: 'transaction' },
				],
				default: 'account',
			},
			...accountOperations,
			...accountFields,
			...transactionOperations,
			...transactionFields,
			...cashFlowOperations,
			...cashFlowFields,
			...budgetOperations,
			...budgetFields,
			...netWorthOperations,
			...netWorthFields,
		],
	};

	methods = {
		credentialTest: {
			async monarchCredentialTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				return monarchCredentialTest.call(
					this,
					credential as Parameters<typeof monarchCredentialTest>[0],
				);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		// Login once per execution
		const token = await monarchLogin.call(this);

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'account') {
					if (operation === 'getAll') {
						const responseData = await monarchRequest.call(
							this,
							token,
							'GetAccounts',
							GET_ACCOUNTS,
						);
						const accounts = (responseData.accounts as IDataObject[]) ?? [];
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(accounts),
							{ itemData: { item: i } },
						);
						returnData.push.apply(returnData, executionData);
						continue;
					}

					if (operation === 'getHistory') {
						const accountId = this.getNodeParameter('accountId', i) as string;
						const responseData = await monarchRequest.call(
							this,
							token,
							'GetAccountHistory',
							GET_ACCOUNT_HISTORY,
							{ accountId },
						);
						const history = (responseData.accountHistory as IDataObject[]) ?? [];
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(history),
							{ itemData: { item: i } },
						);
						returnData.push.apply(returnData, executionData);
						continue;
					}
				}

				if (resource === 'transaction') {
					if (operation === 'getMany') {
						const limit = this.getNodeParameter('limit', i);
						const offset = this.getNodeParameter('offset', i) as number;
						const filters = this.getNodeParameter('filters', i);

						const gqlFilters: IDataObject = {};
						if (filters.search) {
							gqlFilters.search = filters.search;
						}
						if (filters.startDate) {
							gqlFilters.startDate = toDateString(filters.startDate as string);
						}
						if (filters.endDate) {
							gqlFilters.endDate = toDateString(filters.endDate as string);
						}
						if (filters.hasAttachments) {
							gqlFilters.hasAttachments = filters.hasAttachments;
						}
						if (filters.hasNotes) {
							gqlFilters.hasNotes = filters.hasNotes;
						}
						if (filters.isRecurring) {
							gqlFilters.isRecurring = filters.isRecurring;
						}
						if (filters.isSplit) {
							gqlFilters.isSplit = filters.isSplit;
						}

						const responseData = await monarchRequest.call(
							this,
							token,
							'GetTransactionsList',
							GET_TRANSACTIONS_LIST,
							{
								offset,
								limit,
								orderBy: 'date',
								filters: gqlFilters,
							},
						);

						const allTransactions = responseData.allTransactions as IDataObject;
						const results = (allTransactions?.results as IDataObject[]) ?? [];
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push.apply(returnData, executionData);
						continue;
					}

					if (operation === 'getSummary') {
						const responseData = await monarchRequest.call(
							this,
							token,
							'GetTransactionsPage',
							GET_TRANSACTIONS_PAGE,
							{ filters: {} },
						);
						const aggregates = (responseData.aggregates as IDataObject) ?? {};
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray([aggregates]),
							{ itemData: { item: i } },
						);
						returnData.push.apply(returnData, executionData);
						continue;
					}
				}

				if (resource === 'cashFlow') {
					if (operation === 'getSummary') {
						const startDate = toDateString(this.getNodeParameter('startDate', i) as string);
						const endDate = toDateString(this.getNodeParameter('endDate', i) as string);

						const responseData = await monarchRequest.call(
							this,
							token,
							'GetCashflowSummary',
							GET_CASHFLOW_SUMMARY,
							{ startDate, endDate },
						);
						const summary = (responseData.summary as IDataObject) ?? {};
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray([summary]),
							{ itemData: { item: i } },
						);
						returnData.push.apply(returnData, executionData);
						continue;
					}
				}

				if (resource === 'budget') {
					if (operation === 'getAll') {
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const startDate = additionalFields.startDate
							? toDateString(additionalFields.startDate as string)
							: monthOffset(-1);
						const endDate = additionalFields.endDate
							? toDateString(additionalFields.endDate as string)
							: lastDayOfMonthOffset(1);

						const responseData = await monarchRequest.call(
							this,
							token,
							'Common_GetJointPlanningData',
							GET_JOINT_PLANNING_DATA,
							{ startDate, endDate },
						);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray([responseData]),
							{ itemData: { item: i } },
						);
						returnData.push.apply(returnData, executionData);
						continue;
					}
				}

				if (resource === 'netWorth') {
					if (operation === 'getSnapshots') {
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const filters: IDataObject = {};
						if (additionalFields.startDate) {
							filters.startDate = toDateString(additionalFields.startDate as string);
						}
						if (additionalFields.endDate) {
							filters.endDate = toDateString(additionalFields.endDate as string);
						}
						if (additionalFields.accountType) {
							filters.accountType = additionalFields.accountType;
						}

						const responseData = await monarchRequest.call(
							this,
							token,
							'GetAggregateSnapshots',
							GET_AGGREGATE_SNAPSHOTS,
							{ filters },
						);
						const snapshots = (responseData.aggregateSnapshots as IDataObject[]) ?? [];
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(snapshots),
							{ itemData: { item: i } },
						);
						returnData.push.apply(returnData, executionData);
						continue;
					}

					if (operation === 'getByAccountType') {
						const startDate = toDateString(this.getNodeParameter('startDate', i) as string);
						const timeframe = this.getNodeParameter('timeframe', i) as string;

						const responseData = await monarchRequest.call(
							this,
							token,
							'GetSnapshotsByAccountType',
							GET_SNAPSHOTS_BY_ACCOUNT_TYPE,
							{ startDate, timeframe },
						);
						const snapshots = (responseData.snapshotsByAccountType as IDataObject[]) ?? [];
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(snapshots),
							{ itemData: { item: i } },
						);
						returnData.push.apply(returnData, executionData);
						continue;
					}
				}

				throw new NodeOperationError(
					this.getNode(),
					`Unknown resource/operation: ${resource}/${operation}`,
					{ itemIndex: i },
				);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					);
					returnData.push.apply(returnData, executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
