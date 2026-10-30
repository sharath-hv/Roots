import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CartProvider } from './cart/CartContext';
import { App } from './App';
import './styles.css';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </StrictMode>,
);
