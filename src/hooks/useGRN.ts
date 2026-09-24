import { useState, useEffect } from 'react';
import { grnService } from '../services/GRNService';

export function useGRN() {
  const [grns, setGRNs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGRNs = async () => {
    try {
      setLoading(true);
      const data = await grnService.getGRNs();
      setGRNs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGRNs(); }, []);

  return { grns, loading, error, grnService, refetch: fetchGRNs };
}
