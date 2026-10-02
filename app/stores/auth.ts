import { defineStore } from 'pinia'

interface User {
  user_id: string | number
  id?: string | number
  full_name: string 
  email: string
  acctype_id: string | number
  birth_date: string 
  age: number
  role: string
  org_id: string | number | null
  office_id?: string | number | null
  current_office_id?: string | number | null
  officeIds?: Array<string | number>
}

interface org {
  name: string;
  user_id: number;
}

interface OrgDetails {
  org_id: string | number
  name: string
  code: string
  enable_employee_validation?: boolean
  created_at: string
}

interface LoginCredentials {
  email: string
  password: string
}

interface AuthState {
  user: User | null
  /** True once /api/auth/me has been asked who is signed in (see plugins/auth.ts). */
  loaded: boolean
  loading: boolean,
  currentOrg: OrgDetails | null
}

export const useAuthStore = defineStore('auth', {
  // The signed-in user comes only from the server (/api/auth/me), backed by the
  // HttpOnly session cookie — nothing about identity is stored in readable cookies.
  state: (): AuthState => ({
    user: null,
    loaded: false,
    loading: false,
    currentOrg: null,
  }),

  getters: {
    isOrg: (state) => state.user?.org_id || null,
    userRole: (state) => state.user?.role || null,
    currentOfficeId: (state) => state.user?.current_office_id || state.user?.office_id || null,

    isLoggedIn: (state) => !!state.user,
    isLoading: (state) => state.loading,
    needsOrgSetup: (state) => {
      return state.user?.role === 'client' && !state.user?.org_id
    }
  },

  actions: {
    /** Loads the signed-in user from the server session. Uses the request's cookies during SSR. */
    async fetchMe() {
      try {
        const fetcher = import.meta.server ? useRequestFetch() : $fetch
        const res = await fetcher<{ user: User | null }>('/api/auth/me')
        this.user = res.user ?? null
      } catch {
        this.user = null
      } finally {
        this.loaded = true
      }
      return this.user
    },

    async fetchMyOrg() {
      const uId = this.user?.user_id || this.user?.id;
      const orgId = this.user?.org_id;
      if (!uId && !orgId) return;
      
      try {
        let org = await $fetch<OrgDetails>('/api/org/getorg', {
          method: 'POST',
          body: { user_id: uId, org_id: orgId }
        });
        if (typeof org === 'string') {
          org = JSON.parse(org);
        }
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
        const res = await $fetch<{ user: User }>('/api/auth/login', {
          method: 'POST',
          body: credentials
        })
        this.setAuth(res.user)
        
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
        const res = await $fetch<{ user: User }>('/api/auth/register', {
          method: 'POST',
          body: credentials
        })

        this.setAuth(res.user)
        return { success: true, autoLogin: true, user: res.user }
      } catch (error) {
        throw error
      } finally {
        this.loading = false;
      }
    },

    /** The session cookie itself is set by the server; this only updates in-memory state. */
    setAuth(user: User) {
      this.user = user
      this.loaded = true
    },

    async logout() {
      try {

        await $fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {
        console.error("Server logout failed, clearing local state anyway");
      }

      this.user = null
      this.currentOrg = null

      return navigateTo('/', { replace: true })
    }
  }
})