import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ThemeProvider } from './context/ThemeContext';
import { TaxProvider } from './context/TaxContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <TaxProvider>
          <App />
        </TaxProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
