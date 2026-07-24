import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authService, RegisterPayload, LoginPayload } from '../services/auth';
import { useAuthStore } from '../store/auth';

function parseUserIdFromToken(token: string): string | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed.sub || null;
  } catch (e) {
    return null;
  }
}

export function useAuth() {
  const router = useRouter();
  const { setSession, logout: clearAuthStore } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginPayload) => {
      const response = await authService.login(credentials);
      return { token: response.access_token, email: credentials.email };
    },
    onSuccess: ({ token, email }) => {
      const namePrefix = email.split('@')[0];
      const displayName = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1);
      const userId = parseUserIdFromToken(token) || 'user-session';

      const loggedInUser = {
        id: userId,
        email,
        full_name: displayName,
        is_active: true,
        is_superuser: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setSession(loggedInUser, token);
      router.push('/dashboard');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterPayload) => {
      const user = await authService.register(userData);
      return { user, password: userData.password };
    },
    onSuccess: async ({ user, password }) => {
      // Auto-login after registration using registered profile details
      const response = await authService.login({ email: user.email, password });
      setSession(user, response.access_token);
      router.push('/dashboard');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await authService.logout();
    },
    onSettled: () => {
      clearAuthStore();
      router.push('/login');
    },
  });

  return {
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  };
}

