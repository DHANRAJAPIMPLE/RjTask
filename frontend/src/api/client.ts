import axios from 'axios';
import toast from 'react-hot-toast';

const base_url : string = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
/**
 * API CLIENT LOGIC:
 * Configures a global Axios instance for unified backend communication.
 * Logic:
 * 1. Base URL points to the running backend service.
 * 2. 'withCredentials: true' ensures that HTTP-only cookies (JWT, Refresh) 
 *    are automatically attached to every outgoing request.
 */
const api = axios.create({
  baseURL: base_url, 
  withCredentials: true, 
});

/**
 * RESPONSE INTERCEPTOR LOGIC:
 * Automatically processes every response before it reaches the component.
 * Logic:
 * 1. STATUS SUCCESS: Pass the response straight through.
 * 2. STATUS 401 (Unauthorized): This indicates the access token is invalid or expired.
 *    - Logic: Wipe local user data from localStorage as the session is technically over.
 *    - Logic: Show an error toast to notify the user.
 *    - Logic: Redirect to '/login' to force re-authentication (if not already there).
 * 3. OTHER ERRORS: Extract and standardize the error message for consistent UI feedback.
 */
api.interceptors.response.use(
  (response) => response, // Standard success path
  (error) => {
    // Logic: Extract error message from backend or use a defaults
    const message = error.response?.data?.message || 'Something went wrong';

    if (error.response?.status === 401) {
      // Logic: Cleanup stale session data from the browser on auth failure
      try {
        localStorage.removeItem('user');
      } catch {
        // ignore storage errors
      }

      toast.error(message);

      // Logic: Force redirect to login page if we aren't already there
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }

    // Logic: Forward the rejected promise so the calling component can also handle specific errors
    return Promise.reject({ ...error, message });
  }
);

export default api;

