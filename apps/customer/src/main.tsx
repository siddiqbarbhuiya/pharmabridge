import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from '@tanstack/react-query'
import './index.css'
import App from './App'
import { useToastStore } from './stores/toastStore'

function extractMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const e = error as { response?: { data?: { error?: { message?: string } } } }
    const msg = e.response?.data?.error?.message
    if (msg) return msg
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => useToastStore.getState().addToast(extractMessage(error), 'error'),
  }),
  mutationCache: new MutationCache({
    onError: (error) => useToastStore.getState().addToast(extractMessage(error), 'error'),
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status && status >= 400 && status < 500) return false
        return failureCount < 3
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
