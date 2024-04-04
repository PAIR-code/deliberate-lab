/** Tanstack angular mutations.
 */

import { HttpClient } from '@angular/common/http';
import { QueryClient, injectMutation } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SimpleResponse } from '../types/api.types';

export const deleteExperimentMutation = (http: HttpClient, client: QueryClient) =>
  injectMutation(() => ({
    mutationFn: (experimentId: string) =>
      lastValueFrom(
        http.delete<SimpleResponse<string>>(
          `${environment.cloudFunctionsUrl}/deleteExperiment/${experimentId}`,
        ),
      ),
    onSuccess: () => {
      client.refetchQueries({ queryKey: ['experiments'] });
    },
  }));
