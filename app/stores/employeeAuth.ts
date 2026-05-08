import { defineStore } from "pinia"
import { useAuthStore } from "./auth" 

interface AuthState {
  loading: boolean,
  orgId:number
}

interface OrgCode {
    code:string
}



interface emplyoee {
  user_id: number
  full_name: string 
  email: string
  accType_id: number
  birth_date: string 
  verified:number,
  age: number
  role: string,
  org_id:number | null
}



export const useEmployeeAuthStore = defineStore("employeeAuth", {
  state: (): AuthState => ({
    loading: false,
    orgId: 0
  }),

  getters: {
    currentUser: (state) => {
      const authStore = useAuthStore()
      return authStore.user
    },
    
    isAuthenticated: (state) => {
      const authStore = useAuthStore()
      return authStore.isLoggedIn
    }
  },

  actions: {
  
async fetchOrgCode(credentials: OrgCode) {
  this.loading = true;
  try {
    const normalizedCode = (credentials.code || '').trim();
    const res: any = await $fetch("/api/org/getOrdCode", {
      method: "POST",
      body: { code: normalizedCode }
    });
    if (res.success) {
      this.orgId = res.rows.org_id;
      return res.rows; 
    } else {
      return "Invalid Code"
    }
    } catch (error) {
      console.error("Store Error:", error);
      throw error; 
    } finally {
      this.loading = false;
    }
  }
  }
})