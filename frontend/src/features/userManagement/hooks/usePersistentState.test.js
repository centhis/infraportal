import { renderHook, act } from '@testing-library/react';
import usePersistentState from './usePersistentState';

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
        removeItem: (key) => {
            delete store[key];
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

describe('usePersistentState', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with the initial value if localStorage is empty', () => {
        const { result } = renderHook(() => usePersistentState('testKey', 'initial'));
        expect(result.current[0]).toBe('initial');
    });

    it('should initialize from localStorage if a value exists', () => {
        window.localStorage.setItem('testKey', JSON.stringify('stored'));
        const { result } = renderHook(() => usePersistentState('testKey', 'initial'));
        expect(result.current[0]).toBe('stored');
    });

    it('should update the state and localStorage when the setter is called', () => {
        const { result } = renderHook(() => usePersistentState('testKey', 'initial'));

        act(() => {
            result.current[1]('updated');
        });

        expect(result.current[0]).toBe('updated');
        expect(JSON.parse(window.localStorage.getItem('testKey'))).toBe('updated');
    });

    it('should handle objects as values', () => {
        const initialObject = { a: 1 };
        const updatedObject = { b: 2 };

        const { result } = renderHook(() => usePersistentState('objectKey', initialObject));
        expect(result.current[0]).toEqual(initialObject);

        act(() => {
            result.current[1](updatedObject);
        });

        expect(result.current[0]).toEqual(updatedObject);
        expect(JSON.parse(window.localStorage.getItem('objectKey'))).toEqual(updatedObject);
    });

    it('should return initial value if localStorage parsing fails', () => {
        window.localStorage.setItem('badKey', 'not-json');
        const { result } = renderHook(() => usePersistentState('badKey', 'initial'));
        expect(result.current[0]).toBe('initial');
        expect(console.error).toHaveBeenCalled();
    });
});
