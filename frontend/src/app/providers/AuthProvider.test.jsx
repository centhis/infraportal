import { render, screen } from "@testing-library/react";
import { AuthProvider, useAuthContext } from "./AuthProvider";
import { useAuth } from "../../features/auth/hooks/useAuth";

// Mock the useAuth hook
vi.mock("../../features/auth/hooks/useAuth");

// A test component that consumes the context
const TestComponent = () => {
    const { user, loading } = useAuthContext();

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <span>User: {user ? user.name : 'None'}</span>
        </div>
    );
};

describe("AuthProvider", () => {

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should render children", () => {
        useAuth.mockReturnValue({ user: null, loading: false });
        render(
            <AuthProvider>
                <div>Child Component</div>
            </AuthProvider>
        );

        expect(screen.getByText("Child Component")).toBeInTheDocument();
    });

    it("should provide a loading state", () => {
        useAuth.mockReturnValue({ user: null, loading: true });
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should provide user context to children when authenticated", () => {
        const mockUser = { name: 'Test User' };
        useAuth.mockReturnValue({ user: mockUser, loading: false });
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        expect(screen.getByText("User: Test User")).toBeInTheDocument();
    });

    it("should provide null user when not authenticated", () => {
        useAuth.mockReturnValue({ user: null, loading: false });
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        expect(screen.getByText("User: None")).toBeInTheDocument();
    });

    it("should throw an error if useAuthContext is used outside of AuthProvider", () => {
        // Suppress console.error from polluting the test output
        const consoleError = console.error;
        console.error = vi.fn();

        // This test works by checking the default context value, which is null.
        // The hook throws an error if the context value is falsy.
        expect(() => render(<TestComponent />)).toThrow(
            "useAuthContext must be used within an AuthProvider"
        );

        // Restore console.error
        console.error = consoleError;
    });
});
