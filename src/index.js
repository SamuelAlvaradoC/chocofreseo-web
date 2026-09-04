import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { RefrescoProvider } from './context/RefrescoContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <CartProvider>
        <RefrescoProvider>
          <App />
        </RefrescoProvider>
      </CartProvider>
    </AuthProvider>
  </React.StrictMode>
);