import type { ICredentialDataDecryptedObject, ICredentialTestFunctions, IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INodeCredentialTestResult } from 'n8n-workflow';
export declare function monarchLogin(this: IExecuteFunctions | ILoadOptionsFunctions): Promise<string>;
export declare function monarchRequest(this: IExecuteFunctions | ILoadOptionsFunctions, token: string, operationName: string, query: string, variables?: IDataObject): Promise<IDataObject>;
/**
 * Credential test function — runs inside ICredentialTestFunctions context where
 * only this.helpers.request() is available (not httpRequest).
 */
export declare function monarchCredentialTest(this: ICredentialTestFunctions, credential: {
    data: ICredentialDataDecryptedObject;
}): Promise<INodeCredentialTestResult>;
//# sourceMappingURL=GenericFunctions.d.ts.map