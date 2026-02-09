import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeAuth } from '@modules/auth/services/AuthService';
import '../index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);

    // Инициализация до рендера, чтобы избежать мерцания
    initializeAuth().then(() => {
        root.render(
            <StrictMode>
                <App />
            </StrictMode>
        );
    });
}
