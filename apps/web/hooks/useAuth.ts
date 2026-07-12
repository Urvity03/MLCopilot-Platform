import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authService, RegisterPayload, LoginPayload } from '../services/auth';
import { useAuthStore } from '../store/auth';

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

      // Create profile details from login input, treating the token as opaque
      const loggedInUser = {
        id: 'opaque-session-id',
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
