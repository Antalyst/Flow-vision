import {defineStore} from "pinia";
import { useAuthStore } from "./auth";
interface officeDetails{
    name: string,
    orgId: number,
    user_id: number
}

interface autoState{
    org_id:null | number
}

export const useOfficeStore = defineStore("office",{
    state: ():autoState=>({
        org_id: null
    }),
    getters: {
        currentOrgId: (state) => {
            const authStore = useAuthStore()
            return authStore.currentOrg?.org_id || null
        }
    },
    actions:{
        async createOffice(credentials:officeDetails){
            try{
                const res: any = await $fetch("/api/office", {
                    method: "POST",
                    body: credentials
                    });

                return res;
            } catch (error) {
                console.error("Error creating office:", error);
            }
        },
        async fetchUserByOrg() {
            const id = this.currentOrgId; 
            
            if (!id) {
                console.warn("No organization ID found. Ensure fetchMyOrg() was called.");
                return null;
            }

            try {
                const res = await $fetch("/api/users/getUserUnderOrg", {
                    method: "POST",
                    body: { orgId: id } 
                });
                return res;
            } catch (error: any) {
                console.error("Fetch Error Details:", error.data);
                throw error; 
            }
        }
    }

})