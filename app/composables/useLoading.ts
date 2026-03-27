export const useLoading = () => {
  const isLoading = useState('global_loading', () => false);

  const startLoading = () => (isLoading.value = true);
  const stopLoading = () => (isLoading.value = false);

  return {
    isLoading,
    startLoading,
    stopLoading
  };
};