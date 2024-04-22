export const createJsonFile = (data: object, filename: string) => {
  const fileMetadata = {
    name: filename,
    mimeType: 'application/json',
  };

  const fileContent = JSON.stringify(data);
  const blob = new Blob([fileContent], { type: 'application/json' });

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }),
  );
  formData.append('file', blob);

  return formData;
};
