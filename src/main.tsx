import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client/react'
import { AuthProvider } from './context/AuthContext'
import { BookingProvider } from './context/BookingContext'
import { apolloClient } from './lib/apollo'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <BookingProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </BookingProvider>
      </AuthProvider>
    </ApolloProvider>
  </StrictMode>,
)
