
export const useDelay = () => {
  const delay = (ms: number = 300) => new Promise((resolve) => setTimeout(resolve, ms));
  return {
    delay
  };
};