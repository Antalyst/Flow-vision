import { defineStore } from 'pinia'

interface User {
  user_id: number
  full_name: string 
  email: string
  accType_id: number
  birth_date: string 
  age: number
  role: string,
  org_id: number | null
}

interface org {
  name: string;
  user_id: number;
}

interface OrgDetails {
  org_id: number
  name: string
  code: string
  created_at: string
}

interface LoginCredentials {
  email: string
  password: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean,
  currentOrg: OrgDetails | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: useCookie<User | null>('auth_user').value || null,
    token: useCookie<string | null>('auth_token').value || null,
    loading: false,
    currentOrg: null,
  }),

  getters: {
    isOrg: (state) => state.user?.org_id || null,
    userRole: (state) => state.user?.role || null,

    isLoggedIn: (state) => !!state.token && state.token !== 'null',
    isLoading: (state) => state.loading,
    needsOrgSetup: (state) => {
      return state.user?.role === 'client' && !state.user?.org_id
    }
  },

  actions: {
    async fetchMyOrg() {
      if (!this.user?.user_id) return;
      
      try {
        const org = await $fetch<OrgDetails>('/api/org/getorg', {
          method: 'POST',
          body: { user_id: this.user.user_id }
        });
        this.currentOrg = org; 
        return org; 
      } catch (error) {
        console.error("Could not load organization:", error);
        return null;
      }
    },
    
    async createOrg(credentials: org) {
      const { delay } = useDelay();
      this.loading = true;
      if (delay) await delay(300); 
      try {
        const res: any = await $fetch('/api/org', {
          method: 'POST',
          body: credentials
        });

        if (res.success) {
          if (this.user) {
            this.user.org_id = res.org_id;
            const userCookie: any = useCookie('auth_user');
            userCookie.value = this.user;
          }
        }
        await this.fetchMyOrg();
        return { success: true };
      } catch (error: any) {
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async login(credentials: LoginCredentials) {
      const { delay } = useDelay();
      this.loading = true;

      try {
        if (delay) await delay(300);
        const res = await $fetch<{ user: User; token: string }>('/api/auth/login', {
          method: 'POST',
          body: credentials
        })
        this.setAuth(res.user, res.token)
        
        return { success: true, user: res.user }
      } catch (error: any) {
        throw error
      } finally {
        this.loading = false;
      }
    },

    async register(credentials: Record<string, any>) {
      const { delay } = useDelay();
      this.loading = true;

      try {
        if (delay) await delay(3000);
        const res = await $fetch<{ user: User; token: string }>('/api/auth/register', {
          method: 'POST',
          body: credentials
        })

        this.setAuth(res.user, res.token)
        return { success: true, autoLogin: true }
      } catch (error) {
        throw error
      } finally {
        this.loading = false;
      }
    },

    setAuth(user: User, token: string) {
      const tokenCookie = useCookie<string | null>('auth_token', { maxAge: 60 * 60 * 24 * 7 })
      const userCookie = useCookie<User | null>('auth_user', { maxAge: 60 * 60 * 24 * 7 })

      tokenCookie.value = token
      userCookie.value = user
      
      this.token = token
      this.user = user
    },

    async logout() {
      try {

        await $fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {
        console.error("Server logout failed, clearing local state anyway");
      }

      this.user = null
      this.token = null
      this.currentOrg = null

      return navigateTo('/', { replace: true })
    }
  }
})