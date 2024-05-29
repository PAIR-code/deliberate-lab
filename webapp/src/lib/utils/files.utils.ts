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

/** Helper method to make the user download some data as a JSON file */
export const downloadJsonFile = (data: object, filename: string) => {
  const jsonData = JSON.stringify(data, null, 2);

  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click(); // Trigger the download

  // Clean up the URL and remove the link after the download
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
