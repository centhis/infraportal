import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { I18nProvider, useI18n } from './I18nProvider';
import i18n from '../../i18n/i18n';
import { I18N_LNG_KEY } from '../../shared/constants/keys';

// Mock the i18n instance
let languageChangedCallback;
vi.mock('../../i18n/i18n', () => ({
    default: {
        language: 'en',
        on: (event, callback) => {
            if (event === 'languageChanged') {
                languageChangedCallback = callback;
            }
        },
        off: vi.fn(),
        changeLanguage: vi.fn(),
    },
}));

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => {
            store[key] = value.toString();
        },
        clear: () => {
            store = {};
        },
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const TestComponent = () => {
    const { currentLanguage, changeLanguage } = useI18n();
    return (
        <div>
            <span data-testid="language-display">{currentLanguage}</span>
            <button onClick={() => changeLanguage('de')}>Change to DE</button>
        </div>
    );
};

describe('I18nProvider', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.clearAllMocks();
        i18n.language = 'en'; // Reset language
        languageChangedCallback = null;
    });

    it('should render children and provide default context', () => {
        render(
            <I18nProvider>
                <TestComponent />
            </I18nProvider>
        );
        expect(screen.getByTestId('language-display')).toHaveTextContent('en');
    });

    it('should initialize with language from localStorage', () => {
        window.localStorage.setItem(I18N_LNG_KEY, 'ru');
        render(
            <I18nProvider>
                <TestComponent />
            </I18nProvider>
        );
        expect(i18n.changeLanguage).toHaveBeenCalledWith('ru');
    });

    it('should call i18n.changeLanguage when context function is used', () => {
        render(
            <I18nProvider>
                <TestComponent />
            </I18nProvider>
        );
        fireEvent.click(screen.getByText('Change to DE'));
        expect(i18n.changeLanguage).toHaveBeenCalledWith('de');
    });

    it('should update context and localStorage when i18n language changes', () => {
        render(
            <I18nProvider>
                <TestComponent />
            </I18nProvider>
        );

        expect(screen.getByTestId('language-display')).toHaveTextContent('en');

        // Simulate the i18n instance changing language
        act(() => {
            languageChangedCallback('fr');
        });

        expect(screen.getByTestId('language-display')).toHaveTextContent('fr');
        expect(window.localStorage.getItem(I18N_LNG_KEY)).toBe('fr');
    });
});
