/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
/**
 * A wrapper for working with spreadsheets, mostly this does two things:
 * 1. Provides a simpler and more uniform way for handling errors (you don't
 *    need to worry about all of exceptions, undefined objects, and explicit
 *    error values.
 * 2. Treats URLs and Sheet IDs unformly, so you don't have to worry if its a
 *    URL or a sheet ID.
 */
/**
 * A sample public spreadsheet for testing (that doesn't need the user to be signed in):
 * https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 */

import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

export interface ErrorObj {
  error: string;
}

export interface GoogleSheetsStatus<T> {
  status: number;
  result?: T;
  statusText?: string;
}

export interface SheetsValues {
  values: string[][];
}

interface SheetInfoRequest {
  spreadsheetId: string; // google sheets doc id.
  access_token?: string;
}

interface SheetDataRequest extends SheetInfoRequest {
  range: string; // e.g. 'Class Data!A2:E',
}

const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

export function isSheetsError<T>(request: T | ErrorObj): request is ErrorObj {
  return (request as ErrorObj).error !== undefined;
}

// Uniform Error handling for a gapi.client.Request.
async function tryGetReponse<T>(f: () => gapi.client.Request<T>): Promise<T | ErrorObj> {
  try {
    const response = await f();
    if (response.status !== 200) {
      return { error: `${response.statusText} (status: ${response.status})` };
    }
    // API assumption: When status == 200, result is always defined.
    return response.result;
  } catch (err: unknown) {
    const sheetResponseError = err as gapi.client.Response<{}>;
    console.warn(err);
    if (sheetResponseError.status === 404) {
      return { error: 'No such spreadsheet exists. Maybe the ID or URL is mistyped? (404)' };
    } else if (sheetResponseError.status === 403) {
      return {
        error:
          'You do not have permission to access this sheet. You need to login with an account that has access, or have the owner make it publicly viewable. (403)',
      };
    }
    return { error: `Unknown error (${sheetResponseError.status}), sorry.` };
  }
}

// Creating a request with an optional accessToken and sheetsID or URL.
function prepareInfoRequest(
  steetIdOrUrl: string,
  accessToken?: google.accounts.oauth2.TokenResponse | null,
): SheetInfoRequest | ErrorObj {
  const match = steetIdOrUrl.match(/^(https\:\/\/docs\.google\.com\/spreadsheets\/d\/)?([a-zA-Z0-9_\-]{5,})\/?/);
  if (!match) {
    return { error: 'No sheet URL or ID entered.' };
  }
  const sheetId = match[2];
  console.log('sheetId:', sheetId);
  // Fetch first 10 files
  const request = {
    spreadsheetId: sheetId,
  } as SheetInfoRequest;
  if (accessToken) {
    request.access_token = accessToken.access_token;
  }
  return request;
}

// Creating a range values request with an optional accessToken and sheetsID or
// URL.
function prepareDataRequest(
  steetIdOrUrl: string,
  range: string,
  accessToken?: google.accounts.oauth2.TokenResponse | null,
): SheetDataRequest | ErrorObj {
  const request = prepareInfoRequest(steetIdOrUrl, accessToken) as SheetDataRequest;
  if (isSheetsError(request)) {
    return request;
  }
  request.range = range;
  return request;
}

@Injectable({
  providedIn: 'root',
})
export class GoogleSheetsService {
  onceReady: Promise<void>;

  constructor() {
    this.onceReady = new Promise((resolve, _reject) => {
      gapi.load('client', async () => {
        await gapi.client.init({
          apiKey: environment.sheetsApiKey,
          discoveryDocs: [DISCOVERY_DOC],
        });
        resolve();
      });
    });
  }

  async getSheetInfo(
    steetIdOrUrl: string,
    accessToken?: google.accounts.oauth2.TokenResponse | null,
  ): Promise<gapi.client.sheets.Spreadsheet | ErrorObj> {
    await this.onceReady;
    const request = prepareInfoRequest(steetIdOrUrl, accessToken);
    if (isSheetsError(request)) {
      return request;
    }
    const spreadsheetResponse = await tryGetReponse(() => gapi.client.sheets.spreadsheets.get(request));
    if (isSheetsError(spreadsheetResponse)) {
      return spreadsheetResponse;
    }
    return spreadsheetResponse;
  }

  async getSheetValues(
    steetIdOrUrl: string,
    range: string,
    accessToken?: google.accounts.oauth2.TokenResponse | null,
  ): Promise<SheetsValues | ErrorObj> {
    await this.onceReady;
    const request = prepareDataRequest(steetIdOrUrl, range, accessToken);
    if (isSheetsError(request)) {
      return request;
    }
    const spreadsheetResponse = await tryGetReponse(() => gapi.client.sheets.spreadsheets.values.get(request));
    if (isSheetsError(spreadsheetResponse)) {
      return spreadsheetResponse;
    }
    if (!spreadsheetResponse.values || spreadsheetResponse.values.length == 0) {
      return { error: 'no values found.' };
    }
    return { values: spreadsheetResponse.values as string[][] };
  }
}
