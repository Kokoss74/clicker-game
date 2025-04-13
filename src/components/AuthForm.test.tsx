import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'; 
import { toast } from 'react-toastify';
import AuthForm from './AuthForm';
import { useAuthStore } from '../store/auth';

// --- Mocks ---
vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn() // We'll set the return value in beforeEach
}));
vi.mock('react-toastify', () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock implementations
// Remove incorrect cast variable
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockClearError = vi.fn();
const mockToastError = toast.error as ReturnType<typeof vi.fn>;

// Default state for the store mock
let mockAuthStoreState = {
  signIn: mockSignIn,
  signUp: mockSignUp,
  error: null as string | null,
  clearError: mockClearError,
  // isLoading is passed as prop, so not needed here directly
};

describe('AuthForm Component', () => {
  beforeEach(() => {
    // Reset mocks and store state before each test
    vi.clearAllMocks();
    mockSignIn.mockReset().mockResolvedValue(undefined); // Default success
    mockSignUp.mockReset().mockResolvedValue(undefined); // Default success
    mockAuthStoreState = {
      signIn: mockSignIn,
      signUp: mockSignUp,
      error: null,
      clearError: mockClearError,
    };
    // Set the return value for the mocked hook
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStoreState);
  });

  // Helper function to render the component with props
  const renderComponent = (isLoading = false) => {
    return render(<AuthForm isLoading={isLoading} />); 
  };

  it('should render Sign In form by default', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/example: 050-1234567/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/your name/i)).not.toBeInTheDocument(); // Name field hidden
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create an account/i })).toBeInTheDocument();
  });

  it('should switch to Sign Up form when toggle button is clicked', () => {
    renderComponent();
    const toggleButton = screen.getByRole('button', { name: /create an account/i });
    fireEvent.click(toggleButton);

    expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument(); // Name field visible
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /already have an account/i })).toBeInTheDocument();
    expect(mockClearError).toHaveBeenCalled(); // Error should be cleared on toggle
  });

  it('should call signIn with correct data on submit in Sign In mode', async () => {
    renderComponent();
    const phoneInput = screen.getByPlaceholderText(/example: 050-1234567/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    const testPhone = '0501234567';

    fireEvent.change(phoneInput, { target: { value: testPhone } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
      expect(mockSignIn).toHaveBeenCalledWith({ phone: testPhone });
    });
  });

  it('should call signUp with correct data on submit in Sign Up mode', async () => {
    renderComponent();
    // Switch to Sign Up mode
    fireEvent.click(screen.getByRole('button', { name: /create an account/i }));

    const phoneInput = screen.getByPlaceholderText(/example: 050-1234567/i);
    const nameInput = screen.getByPlaceholderText(/your name/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    const testPhone = '0509876543';
    const testName = 'New User';

    fireEvent.change(phoneInput, { target: { value: testPhone } });
    fireEvent.change(nameInput, { target: { value: testName } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledTimes(1);
      expect(mockSignUp).toHaveBeenCalledWith({ phone: testPhone, name: testName });
    });
  });

   it('should show validation error if name is too short during sign up', async () => {
     renderComponent();
     fireEvent.click(screen.getByRole('button', { name: /create an account/i })); // Switch to Sign Up

     const nameInput = screen.getByPlaceholderText(/your name/i);
     const submitButton = screen.getByRole('button', { name: /sign up/i });

     fireEvent.change(nameInput, { target: { value: 'ab' } }); // Short name
     fireEvent.click(submitButton);

     await waitFor(() => {
       expect(screen.getByText(/name too short/i)).toBeInTheDocument();
     });
     expect(mockSignUp).not.toHaveBeenCalled();
   });

  it('should display error message from store', async () => {
    const errorMessage = 'Invalid phone number';
    mockAuthStoreState.error = errorMessage; // Set error in mock state
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStoreState); // Update mock return value

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should clear error when input changes', async () => {
    const errorMessage = 'Some error';
    mockAuthStoreState.error = errorMessage;
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStoreState);

    const { rerender } = renderComponent(); 

    // Error should be visible initially
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Change phone input
    const phoneInput = screen.getByPlaceholderText(/example: 050-1234567/i);
    fireEvent.change(phoneInput, { target: { value: '1' } });

    // Error should disappear
    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();

    // Switch to sign up and check name input clears error
    fireEvent.click(screen.getByRole('button', { name: /create an account/i }));
    // Set error again for sign up mode
    mockAuthStoreState.error = 'Another error';
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStoreState);
    // Rerender the component to pick up the new store state
    // Use act to wrap state update and rerender if causing warnings
    act(() => {
      rerender(<AuthForm isLoading={false} />);
    });

    // Now wait for the error to appear after rerender
     await waitFor(() => {
       expect(screen.getByText('Another error')).toBeInTheDocument();
     });

     const nameInput = screen.getByPlaceholderText(/your name/i);
     fireEvent.change(nameInput, { target: { value: 'a' } });
     expect(screen.queryByText('Another error')).not.toBeInTheDocument();

  });

  it('should disable inputs and buttons when isLoading is true', () => {
    renderComponent(true); // Pass isLoading=true

    expect(screen.getByPlaceholderText(/example: 050-1234567/i)).toBeDisabled();
    expect(screen.getByTestId('submit-button')).toBeDisabled(); // Use data-testid
    expect(screen.getByRole('button', { name: /create an account/i })).toBeDisabled();

    // Check loader is visible
    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument(); // Check presence using data-testid
  });

   it('should automatically switch to Sign Up on "Invalid login credentials" error', async () => {
     renderComponent(); // Start in Sign In mode
     const { rerender } = render(<AuthForm isLoading={false} />); // Get rerender from initial render
 
     // Simulate the error coming from the store *after* initial render
     act(() => {
        mockAuthStoreState.error = "Invalid login credentials";
        // Update the mock return value *before* rerendering
        vi.mocked(useAuthStore).mockReturnValue({...mockAuthStoreState});
     });
 
     // Rerender the component to pick up the new store state from the hook
     rerender(<AuthForm isLoading={false} />);
 
     await waitFor(() => {
       // Check for the toast message
       expect(mockToastError).toHaveBeenCalledWith("User not registered. Please create an account.");
       // Check if the form switched to Sign Up mode
       expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument();
       expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
     });

     // Error message itself might still be displayed briefly or cleared by the switch
     // expect(screen.queryByText("Invalid login credentials")).not.toBeInTheDocument(); // Depends on timing
   });

});