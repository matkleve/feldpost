type ExistingRow = {
  latitude: number | null;
  longitude: number | null;
};

type FetchAttachExistingRowArgs = {
  fetchRow: () => Promise<{ data: ExistingRow | null; error: unknown }>;
  onFetchError: (error: unknown) => Promise<void>;
};

export async function fetchAttachExistingRow(
  args: FetchAttachExistingRowArgs,
): Promise<{ existingRow: ExistingRow; hadExistingCoords: boolean } | null> {
  const { fetchRow, onFetchError } = args;
  const { data, error } = await fetchRow();

  if (error || !data) {
    await onFetchError(error);
    return null;
  }

  return {
    existingRow: data,
    hadExistingCoords: data.latitude != null && data.longitude != null,
  };
}
