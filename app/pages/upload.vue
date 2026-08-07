<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto space-y-8">
      <!-- Ingestion Header -->
      <div class="text-center space-y-2">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Icon name="lucide:shield" class="text-sm" />
          AES-256-GCM Secure Channel
        </div>
        <h1 class="text-4xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent sm:text-5xl">
          Document Ingestion Portal
        </h1>
        <p class="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
          Securely upload, automatically encrypt, and route documents through the Flow-vision tracking network.
        </p>
      </div>

      <!-- Authentication & Profile Cache State -->
      <div class="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
        <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all duration-500"></div>
        <h2 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
          <Icon name="lucide:user-check" class="text-indigo-500 text-base" />
          Active Ingestion Identity
        </h2>
        
        <!-- Loading State -->
        <div v-if="authLoading" class="flex items-center gap-3 py-3 text-slate-400 text-sm">
          <Icon name="lucide:loader-2" class="animate-spin text-indigo-500 text-lg" />
          <span>Synchronizing credentials with central profile tracking...</span>
        </div>
        
        <!-- Error & Fallback Setup -->
        <div v-else-if="authError" class="bg-amber-950/20 border border-amber-900/40 text-amber-200 rounded-xl p-4 space-y-3">
          <div class="flex gap-3">
            <Icon name="lucide:alert-triangle" class="text-amber-400 text-xl shrink-0 mt-0.5" />
            <div>
              <p class="font-bold text-sm">Profile Sync Warning</p>
              <p class="text-xs text-slate-400 mt-1">
                Unable to locate profile metadata via Supabase auth ({{ authError }}).
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 pt-2 border-t border-amber-900/30">
            <button type="button" @click="retryAuth" class="px-3 py-1.5 bg-amber-900/40 hover:bg-amber-900/60 rounded-lg text-xs font-semibold transition">
              Retry Sync
            </button>
            <button type="button" @click="useSandboxProfile" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold transition">
              Use Sandbox Settings
            </button>
          </div>
        </div>

        <!-- Sync Success Output -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 flex items-center gap-3 hover:border-slate-700/80 transition-colors">
            <div class="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
              <Icon name="lucide:fingerprint" class="text-xl" />
            </div>
            <div>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ingestion User ID</p>
              <p class="font-mono text-sm text-blue-400 font-bold mt-0.5">{{ userProfile.user_id }}</p>
            </div>
          </div>

          <div class="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 flex items-center gap-3 hover:border-slate-700/80 transition-colors">
            <div class="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
              <Icon name="lucide:building-2" class="text-xl" />
            </div>
            <div>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Source Office ID</p>
              <p class="font-mono text-sm text-purple-400 font-bold mt-0.5">{{ userProfile.office_id }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Ingestion Form -->
      <form @submit.prevent="handleFormSubmit" class="space-y-6">
        <!-- File Dropzone -->
        <div class="space-y-2">
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400">Document Payload</label>
          <div 
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="handleFileDrop"
            @click="triggerFileInput"
            :class="[
              'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 relative group overflow-hidden flex flex-col items-center justify-center min-h-[220px]',
              dragOver 
                ? 'border-indigo-500 bg-indigo-500/10 shadow-indigo-500/5 shadow-2xl scale-[1.01]' 
                : 'border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50'
            ]"
          >
            <!-- Hover Gradient Background -->
            <div class="absolute inset-0 bg-gradient-to-b from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <input 
              ref="fileInput"
              type="file" 
              accept=".pdf,.docx" 
              class="hidden" 
              @change="handleFileChange"
            />

            <!-- Ingestion Graphic Icon -->
            <div class="p-4 bg-slate-950/60 border border-slate-800 rounded-full text-indigo-400 group-hover:scale-115 transition-transform duration-300 shadow-md">
              <Icon name="lucide:upload-cloud" class="text-3xl" />
            </div>

            <!-- Upload Instructions -->
            <div class="mt-4 space-y-1 z-10">
              <p class="text-sm font-semibold text-slate-200">
                <span class="text-indigo-400 group-hover:text-indigo-300 transition-colors">Choose document</span> or drag & drop here
              </p>
              <p class="text-xs text-slate-500">PDF or Word DOCX documents accepted</p>
            </div>

            <!-- Active Selection Metadata Badge -->
            <div 
              v-if="selectedFile" 
              class="mt-6 w-full max-w-md bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-left gap-3 shadow-2xl z-10"
              @click.stop
            >
              <div class="flex items-center gap-3 overflow-hidden">
                <div class="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                  <Icon name="lucide:file-code" class="text-xl" />
                </div>
                <div class="overflow-hidden">
                  <p class="text-xs font-semibold text-slate-300 truncate">{{ selectedFile.name }}</p>
                  <p class="text-[10px] text-slate-500 mt-0.5">{{ formatFileSize(selectedFile.size) }}</p>
                </div>
              </div>
              <button 
                type="button" 
                @click="clearSelectedFile" 
                class="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg transition"
              >
                <Icon name="lucide:trash-2" class="text-sm" />
              </button>
            </div>
          </div>
        </div>

        <!-- Form Text Metadata -->
        <div class="space-y-4">
          <div class="space-y-2">
            <label for="doc-name" class="block text-xs font-bold uppercase tracking-wider text-slate-400">Document Title</label>
            <input 
              id="doc-name"
              v-model="documentName"
              type="text" 
              required
              placeholder="Provide a reference name for this document"
              class="w-full bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition text-sm"
            />
          </div>

          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label for="doc-desc" class="block text-xs font-bold uppercase tracking-wider text-slate-400">Document Description</label>
              <span class="text-[10px] text-slate-500 font-mono">{{ documentDescription.length }}/500</span>
            </div>
            <textarea 
              id="doc-desc"
              v-model="documentDescription"
              maxlength="500"
              rows="4"
              placeholder="Describe document purpose, target audience or custom routing notes..."
              class="w-full bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition resize-none text-sm"
            ></textarea>
          </div>
        </div>

        <!-- Submit Controls -->
        <div class="pt-4">
          <button 
            type="submit" 
            :disabled="isSubmitting || !selectedFile || !userProfile.user_id"
            class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 flex items-center justify-center gap-3 relative overflow-hidden group text-sm"
          >
            <template v-if="isSubmitting">
              <Icon name="lucide:loader-2" class="animate-spin text-base" />
              <span>{{ subStatusMessage }}</span>
            </template>
            <template v-else>
              <Icon name="lucide:shield-check" class="text-base group-hover:scale-110 transition-transform" />
              <span>Encrypt and Route to Gateway</span>
            </template>
          </button>
        </div>
      </form>

      <!-- Success/Error Feedback Panel -->
      <Transition
        enter-active-class="transform ease-out duration-300 transition"
        enter-from-class="translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="toast" :class="[
          'rounded-2xl p-5 border flex gap-3 shadow-2xl relative overflow-hidden',
          toast.type === 'success' 
            ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200' 
            : 'bg-red-950/20 border-red-900/40 text-red-200'
        ]">
          <Icon 
            :name="toast.type === 'success' ? 'lucide:check-circle-2' : 'lucide:alert-circle'" 
            :class="[
              'text-2xl shrink-0 mt-0.5',
              toast.type === 'success' ? 'text-emerald-400' : 'text-red-400'
            ]"
          />
          <div class="flex-grow space-y-1">
            <p class="font-bold text-sm">{{ toast.title }}</p>
            <p class="text-xs text-slate-400 leading-relaxed">{{ toast.message }}</p>
            <div v-if="toast.details" class="text-[11px] font-mono text-indigo-300 mt-3 bg-slate-950/80 p-3 rounded-lg border border-slate-800 leading-normal">
              {{ toast.details }}
            </div>
          </div>
          <button type="button" @click="toast = null" class="text-slate-500 hover:text-slate-300 shrink-0 self-start">
            <Icon name="lucide:x" class="text-lg" />
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSupabaseClient } from '#imports';
import { useAuthStore } from '~/stores/auth';

// 1. Core States
const selectedFile = ref<File | null>(null);
const documentName = ref('');
const documentDescription = ref('');
const documentDataRaw = ref('');
const dragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

// 2. Submission & Connection Loading states
const isSubmitting = ref(false);
const subStatusMessage = ref('');
const authLoading = ref(true);
const authError = ref<string | null>(null);

// 3. User Ingestion Identity Details
const userProfile = ref({
  user_id: '' as string | number,
  office_id: '' as string | number | null
});

// 4. Custom Feedback Toasts
interface Toast {
  type: 'success' | 'error';
  title: string;
  message: string;
  details?: string;
}
const toast = ref<Toast | null>(null);

const showToast = (type: 'success' | 'error', title: string, message: string, details?: string) => {
  toast.value = { type, title, message, details };
  if (type === 'success') {
    // Dismiss automatically after 10 seconds for user comfort
    setTimeout(() => {
      if (toast.value && toast.value.title === title) {
        toast.value = null;
      }
    }, 10000);
  }
};

// 5. Fetch profile credentials mapping Supabase active session metadata
const fetchProfileData = async () => {
  authLoading.value = true;
  authError.value = null;
  try {
    const supabase = useSupabaseClient();
    
    // Retrieve currently logged-in user active session info
    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    if (!authUser) {
      throw new Error('No active Supabase user session detected. Please authenticate first.');
    }

    // Retrieve user mapping from central profile tracking table
    const { data: profile, error: profileError } = await (supabase as any)
      .from('users')
      .select('user_id, office_id')
      .eq('supabase_auth_id', authUser.id)
      .single();

    if (profileError) {
      throw new Error(`Profile lookup database error: ${profileError.message}`);
    }
    
    if (!profile) {
      throw new Error('Associated profile record could not be located in central tracking.');
    }

    userProfile.value.user_id = profile.user_id;
    userProfile.value.office_id = profile.office_id;

  } catch (err: any) {
    console.warn('[Supabase Profile Lookup Error]:', err.message);
    authError.value = err.message || 'System sync failure';
    
    // Attempt fallback from existing Pinia Auth Store (convenient for custom auth schemes)
    try {
      const authStore = useAuthStore();
      if (authStore.user && authStore.user.user_id) {
        userProfile.value.user_id = authStore.user.user_id;
        userProfile.value.office_id = authStore.user.org_id || 10; // Fallback default office_id
        authError.value = null; // Sync recovered successfully
      }
    } catch (storeErr) {
      console.error('Pinia store recovery failed:', storeErr);
    }
  } finally {
    authLoading.value = false;
  }
};

const retryAuth = () => {
  fetchProfileData();
};

const useSandboxProfile = () => {
  // Sandbox credentials for testing when local auth database isn't fully seeded
  userProfile.value.user_id = 999;
  userProfile.value.office_id = 10;
  authError.value = null;
  showToast('success', 'Sandbox Credentials Loaded', 'Connected session simulated using testing values.');
};

// 6. Handle File selection and Base64 conversion
const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    processFile(target.files[0]);
  }
};

const handleFileDrop = (event: DragEvent) => {
  dragOver.value = false;
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    processFile(event.dataTransfer.files[0]);
  }
};

const processFile = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'pdf' && extension !== 'docx') {
    showToast('error', 'Unsupported Extension', 'Please select a valid PDF (.pdf) or Word (.docx) document.');
    return;
  }

  // Maximum size 25MB check
  if (file.size > 25 * 1024 * 1024) {
    showToast('error', 'File Too Large', 'Selected file size exceeds the 25MB ceiling.');
    return;
  }

  selectedFile.value = file;
  if (!documentName.value) {
    // Auto populate without ext
    documentName.value = file.name.replace(/\.[^/.]+$/, "");
  }

  // Convert browser file content to a clean Base64 string
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result as string;
    // Split the data URL prefix e.g., "data:application/pdf;base64,"
    const splitIndex = result.indexOf(';base64,');
    if (splitIndex !== -1) {
      documentDataRaw.value = result.substring(splitIndex + 8);
    } else {
      documentDataRaw.value = result.split(',')[1] || result;
    }
  };
  reader.onerror = () => {
    showToast('error', 'Read Failure', 'Could not parse the contents of the uploaded file.');
  };
  reader.readAsDataURL(file);
};

const clearSelectedFile = () => {
  selectedFile.value = null;
  documentDataRaw.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 7. On Form Submit: Unified JSON POST Ingestion
const handleFormSubmit = async () => {
  if (!selectedFile.value || !documentDataRaw.value) {
    showToast('error', 'Payload Empty', 'Please provide a file to encrypt and ingest.');
    return;
  }
  if (!userProfile.value.user_id) {
    showToast('error', 'No Identity', 'Session profile is not loaded. Upload rejected.');
    return;
  }

  isSubmitting.value = true;
  subStatusMessage.value = 'Preparing secure payload...';
  toast.value = null;

  try {
    subStatusMessage.value = 'Transmitting to Nitro Security Gateway...';
    
    const response = await $fetch<{
      success: boolean; 
      message: string; 
      data: { tracking_id: number; qr_code: string } 
    }>('/api/documents', {
      method: 'POST',
      body: {
        user_id: userProfile.value.user_id,
        office_id: userProfile.value.office_id || 10,
        document_name: documentName.value,
        document_description: documentDescription.value,
        document_data: documentDataRaw.value,
        status: 'pending'
      }
    });

    if (response && response.success) {
      showToast(
        'success',
        'Ingestion Success',
        'Your document has been safely encrypted using AES-256-GCM and stored in the database vault.',
        `Document ID: ${response.data.tracking_id} | Tracking QR Code: ${response.data.qr_code}`
      );
      
      // Clean up fields
      clearSelectedFile();
      documentName.value = '';
      documentDescription.value = '';
    } else {
      throw new Error(response?.message || 'Server rejected ingestion.');
    }

  } catch (err: any) {
    console.error('[Ingestion Submission Error]:', err);
    showToast(
      'error',
      'Secure Ingestion Rejected',
      err.data?.statusMessage || err.message || 'An unexpected transport error occurred.'
    );
  } finally {
    isSubmitting.value = false;
  }
};

// 8. Lifecycle
onMounted(() => {
  fetchProfileData();
});
</script>

<style scoped>
/* Smooth transition elements */
.v-enter-active,
.v-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
