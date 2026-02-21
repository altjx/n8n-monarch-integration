import type { ICredentialDataDecryptedObject, ICredentialTestFunctions, IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INodeCredentialTestResult } from 'n8n-workflow';
/**
 * Credential test.  The ICredentialTestFunctions context doesn't run
 * preAuthentication automatically, so we handle the token ourselves:
 *   1. Use the stored sessionToken if one exists.
 *   2. Fall back to a fresh email/password login if the token is missing.
 * On a 401 we also retry with a fresh login, in case the stored token expired.
 */
export declare function monarchCredentialTest(this: ICredentialTestFunctions, credential: {
    data: ICredentialDataDecryptedObject;
}): Promise<INodeCredentialTestResult>;
export declare function monarchRequest(this: IExecuteFunctions | ILoadOptionsFunctions, operationName: string, query: string, variables?: IDataObject): Promise<IDataObject>;
//# sourceMappingURL=GenericFunctions.d.ts.map