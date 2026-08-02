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
    onSuccess: async ({ token, email }) => {
      let loggedInUser;
      try {
        // Temporarily store token so client can attach Bearer header
        setSession({ id: '', email, full_name: '', is_active: true, is_superuser: false, created_at: '', updated_at: '' }, token);
        loggedInUser = await authService.me();
      } catch (e) {
        const namePrefix = email.split('@')[0];
        const displayName = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1);
        const userId = parseUserIdFromToken(token) || 'user-session';
        loggedInUser = {
          id: userId,
          email,
          full_name: displayName,
          is_active: true,
          is_superuser: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

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

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => authService.forgotPassword(email),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ token, new_password }: { token: string; new_password: string }) => {
      await authService.resetPassword(token, new_password);
    },
    onSuccess: () => {
      router.push('/login?reset=success');
    },
  });

  return {
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    forgotPassword: forgotPasswordMutation.mutateAsync,
    resetPassword: resetPasswordMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isSendingReset: forgotPasswordMutation.isPending,
    isResettingPassword: resetPasswordMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    forgotPasswordError: forgotPasswordMutation.error,
    resetPasswordError: resetPasswordMutation.error,
  };
}
