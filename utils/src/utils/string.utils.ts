import {UnifiedTimestamp} from '../shared';

export const dateStrOfTimestamp = (timestamp: UnifiedTimestamp): string => {
  const date = timestamp.toDate();
  return (
    `${date.getFullYear()} - ${date.getMonth()} - ${date.getDate()}:` +
    ` ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
  );
};

/** Return the byte size of a string */
export const bytes = (s: string) => new TextEncoder().encode(s).length;

export const describeBytes = (bytes: number): string => {
  if (bytes >= 1073741824) {
    return (bytes / 1073741824).toFixed(2) + ' GB';
  } else if (bytes >= 1048576) {
    return (bytes / 1048576).toFixed(2) + ' MB';
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else if (bytes > 1) {
    return bytes + ' bytes';
  } else if (bytes == 1) {
    return bytes + ' byte';
  } else {
    return '0 bytes';
  }
};
