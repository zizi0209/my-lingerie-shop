export const isNetworkError = (error: unknown): boolean => {
  if (!(error instanceof TypeError)) {
    return false;
  }

  return error.message.toLowerCase().includes('failed to fetch');
};
