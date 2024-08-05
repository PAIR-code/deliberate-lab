/**
 * Functions for data downloads.
 */

/** Download blob (helper function for file downloads) */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click(); // Trigger the download

  // Clean up the URL and remove the link after the download
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/** Download data as a CSV */
export function downloadCSV(data: string[][], filename: string) {
  const csvData = data.map((line: string[]) => line.map(
    line => JSON.stringify(line))
    .join(',')).join('\n');

  const blob = new Blob([csvData], { type: 'application/csv' });
  downloadBlob(blob, filename);
}

/** Download data as a JSON file */
export function downloadJSON(data: object, filename: string) {
  const jsonData = JSON.stringify(data, null, 2);

  const blob = new Blob([jsonData], { type: 'application/json' });
  downloadBlob(blob, filename);
}