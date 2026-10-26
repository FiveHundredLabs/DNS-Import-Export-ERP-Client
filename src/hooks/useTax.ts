import { useTaxContext } from '../context/TaxContext';

export function useTax() {
  return useTaxContext();
}
