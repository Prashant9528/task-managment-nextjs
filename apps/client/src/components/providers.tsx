'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Providers component - Wraps the app with necessary context providers
 * 
 * 'use client' - This component runs in the browser (not server)
 * 
 * QueryClientProvider - Enables React Query for data fetching
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient once (not on every render)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // Data is fresh for 1 minute
            retry: 1, // Retry failed requests once
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
