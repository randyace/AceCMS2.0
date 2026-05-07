export type ContainerAsyncState = {
  loading: boolean;
  saving: boolean;
  uploading?: boolean;
  error: string | null;
  successMessage?: string | null;
  lastUpdatedAt?: string | null;
};

export type ContainerContract<
  TData extends Record<string, unknown>,
  TUiState extends Record<string, unknown>,
  TCallbacks extends Record<string, (...args: any[]) => any>,
  TMeta extends Record<string, unknown> = Record<string, unknown>
> = {
  data: TData;
  uiState: TUiState;
  asyncState: ContainerAsyncState;
  callbacks: TCallbacks;
  meta: TMeta;
};

export function buildContainerContract<
  TData extends Record<string, unknown>,
  TUiState extends Record<string, unknown>,
  TCallbacks extends Record<string, (...args: any[]) => any>,
  TMeta extends Record<string, unknown>
>(contract: ContainerContract<TData, TUiState, TCallbacks, TMeta>) {
  return contract;
}
