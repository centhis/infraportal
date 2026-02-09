import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import usePersistentState from './usePersistentState';
import { createStorageMock, type StorageMock } from '../../mocks/test-helpers';

describe('usePersistentState', () => {
    let storageMock: StorageMock;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        storageMock = createStorageMock();
        Object.defineProperty(window, 'localStorage', {
            value: storageMock,
            writable: true,
        });

        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with the initial value if localStorage is empty', () => {
        const { result } = renderHook(() => usePersistentState<string>('testKey', 'initial'));
        expect(result.current[0]).toBe('initial');
    });

    it('should initialize from localStorage if a value exists', () => {
        storageMock.setItem('testKey', JSON.stringify('stored'));
        const { result } = renderHook(() => usePersistentState<string>('testKey', 'initial'));
        expect(result.current[0]).toBe('stored');
    });

    it('should update the state and localStorage when the setter is called', () => {
        const { result } = renderHook(() => usePersistentState<string>('testKey', 'initial'));

        act(() => {
            result.current[1]('updated');
        });

        expect(result.current[0]).toBe('updated');
        expect(JSON.parse(storageMock.getItem('testKey')!)).toBe('updated');
    });

    it('should handle objects as values', () => {
        const initialObject = { a: 1 };
        const updatedObject = { b: 2 };

        const { result } = renderHook(() => usePersistentState<{ a?: number; b?: number }>('objectKey', initialObject));
        expect(result.current[0]).toEqual(initialObject);

        act(() => {
            result.current[1](updatedObject);
        });

        expect(result.current[0]).toEqual(updatedObject);
        expect(JSON.parse(storageMock.getItem('objectKey')!)).toEqual(updatedObject);
    });

    it('should return initial value if localStorage parsing fails', () => {
        // Мокаем ситуацию, когда JSON.parse выбрасывает исключение или возвращает неожиданное значение.
        // Код делает: const storedValue = window.localStorage.getItem(key); return JSON.parse(storedValue)
        // Поэтому помещение невалидной JSON строки в storageMock должно вызвать catch блок.
        storageMock.setItem('badKey', 'not-json');

        const { result } = renderHook(() => usePersistentState<string>('badKey', 'initial'));
        expect(result.current[0]).toBe('initial');
        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});
