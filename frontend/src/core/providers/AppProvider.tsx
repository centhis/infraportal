import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { I18nProvider } from './I18nProvider';
import { ToastProvider } from './ToastProvider';

export interface AppProviderProps {
    children: ReactNode;
}

/**
 * Единый провайдер приложения, объединяющий все глобальные провайдеры.
 * Порядок важен: QueryProvider → I18nProvider → AuthProvider → ToastProvider
 */
export function AppProvider({ children }: AppProviderProps) {
    return (
        <BrowserRouter>
            <QueryProvider>
                <I18nProvider>
                    <AuthProvider>
                        <ToastProvider>
                            {children}
                        </ToastProvider>
                    </AuthProvider>
                </I18nProvider>
            </QueryProvider>
        </BrowserRouter>
    );
}
