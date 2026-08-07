<template>
    <div class="p-4">
        <h1 class="text-2xl font-bold mb-4">Upload Document</h1>
        <input type = "text" placeholder="Document Name" v-model="document_name" class="border p-2 mb-4 w-full" />
        <input type = "text" placeholder="Document Description" v-model="document_description" class="border p-2 mb-4 w-full" />
        <input type="file" @change="handleFileUpload" accept=".pdf,.docx" />
        <button @click="submitDocument" :disabled="!selectedFile">Upload to LGU System</button>
    </div>
</template>

<script setup>
    const selectedFile = ref(null);
    const base64Data = ref("");

    // 1. Convert the browser file to a Base64 string
    const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    selectedFile.value = file;

    const reader = new FileReader();
    reader.onload = () => {
        // This gives us the raw base64 string (removing the "data:application/pdf;base64," prefix)
        base64Data.value = reader.result.split(',')[1];
    };
    reader.readAsDataURL(file);
    };

    // 2. Send the JSON to your Nitro API
    const submitDocument = async () => {
    try {
        const response = await $fetch('/api/documents', {
        method: 'POST',
        body: {
            user_id: "1", // Get this from your auth state
            office_id: "10",
            document_name: '' || selectedFile.value.name,
            document_data: base64Data.value, // This goes to your encryption logic
            status: 'pending',
            qr_code: "FLOW-123456", // Generate this as needed
            document_description: '' || "No description provided"
        }
        });

        const handlefileUpload = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            selectedFile.value = file;
        
            const reader = new FileReader();
            reader.onload = () => {
                // This gives us the raw base64 string (removing the "data:application/pdf;base64," prefix)
                base64Data.value = reader.result.split(',')[1];
            };
            reader.readAsDataURL(file);
        };

        alert("Document uploaded and encrypted!");
    } catch (err) {
        console.error("Upload failed", err);
    }
    };
</script>