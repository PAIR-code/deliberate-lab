export const dateStrOfTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return (
    `${date.getFullYear()} - ${date.getMonth()} - ${date.getDate()}:` +
    ` ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
  );
};
