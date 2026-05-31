<script setup>
import { PDFDocument } from 'pdf-lib'
import QRCode from 'qrcode'
import { renderAsync } from 'docx-preview'
import { ref } from 'vue'

const useDocProcessor = () => {
  const isProcessing = ref(false)
  const processedUrl = ref(null)
  const trackingId = ref('')
  const fileExtension = ref('')
  const wordPreviewContainer = ref(null)
  const qrBase64 = ref('')

  const processDocument = async (file) => {
    if (!file) return
    const nameParts = file.name.split('.')
    fileExtension.value = nameParts.pop().toLowerCase()
    isProcessing.value = true

    try {
      trackingId.value = `FLOW-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      const arrayBuffer = await file.arrayBuffer()
      qrBase64.value = await QRCode.toDataURL(trackingId.value, { margin: 1, width: 200 })

      if (fileExtension.value === 'pdf') {
        const pdfDoc = await PDFDocument.load(arrayBuffer)
        const qrImage = await pdfDoc.embedPng(qrBase64.value)
        

        const pages = pdfDoc.getPages()
        pages.forEach((page) => {
          const { width, height } = page.getSize()
          page.drawImage(qrImage, {
            x: width - 70,
            y: height - 70,
            width: 50,
            height: 50,
          })
        })

        const pdfBytes = await pdfDoc.save()
        processedUrl.value = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }))
      }
      else if (fileExtension.value === 'docx') {
        if (wordPreviewContainer.value) wordPreviewContainer.value.innerHTML = ''
        await renderAsync(arrayBuffer, wordPreviewContainer.value)
        processedUrl.value = URL.createObjectURL(new Blob([arrayBuffer], { type: file.type }))
      }
    } catch (error) {
      console.error(error)
      alert('Error rendering document')
    } finally {
      isProcessing.value = false
    }
  }

  const printDocument = () => {
    if (fileExtension.value === 'pdf') {
      const printWin = window.open(processedUrl.value)
      printWin.onload = () => {
        printWin.focus()
        printWin.print()
      }
    } else if (fileExtension.value === 'docx') {
      const printWin = window.open('', '_blank')
      const docHtml = wordPreviewContainer.value.innerHTML
      
      printWin.document.write(`
        <html>
          <head>
            <style>
              @page { margin: 0; }
              body { margin: 0; padding: 0; background: white; }
          
              .qr-container { 
                position: fixed; 
                top: 40px; 
                right: 40px; 
                width: 40px; 
                height: 40px; 
                z-index: 999; 
              }
              .docx-wrapper { background: white !important; padding: 0 !important; }
              .docx { box-shadow: none !important; margin: 0 !important; width: 100% !important; }
              img { width: 100%; }
            </style>
          </head>
          <body>
            <div class="qr-container"><img src="${qrBase64.value}" /></div>
            ${docHtml}
          </body>
        </html>
      `)
      printWin.document.close()
      printWin.focus()
      setTimeout(() => {
        printWin.print()
        printWin.close()
      }, 500)
    }
  }

  return { processDocument, printDocument, isProcessing, processedUrl, trackingId, fileExtension, wordPreviewContainer, qrBase64 }
}

const { processDocument, printDocument, isProcessing, processedUrl, trackingId, fileExtension, wordPreviewContainer, qrBase64 } = useDocProcessor()

const onFileChange = (e) => {
  const file = e.target.files[0]
  if (file) processDocument(file)
}
</script>

<template>
  <div class=" bg-gray-100 p-6">
    <div class=" grid grid-cols-1 lg:grid-cols-2 gap-8 h-[80vh]">
      
      <div class="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-gray-200 relative">
        <div class="p-3 bg-gray-50 border-b font-bold text-xs text-gray-400 uppercase tracking-widest text-center">
          Live Document Preview
        </div>
        
        <div class="flex-grow overflow-auto bg-gray-50 relative">
          <div v-if="fileExtension === 'docx' && qrBase64"
              class="absolute top-8 right-8 z-50 p-1 bg-white shadow-lg border border-gray-200 pointer-events-none">
            <img :src="qrBase64" class="w-[60px] h-[60px]" alt="Tracking QR" />
          </div>

          <object
            v-if="processedUrl && fileExtension === 'pdf'"
            :data="processedUrl"
            type="application/pdf"
            class="w-full h-full"
          ></object>

          <div
            v-show="fileExtension === 'docx'"
            ref="wordPreviewContainer"
            class="p-4 bg-white min-h-full"
          ></div>

          <div v-if="!processedUrl" class="h-full flex items-center justify-center text-gray-300 italic text-sm">
            No document loaded
          </div>
        </div>
      </div>

      <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-center">
        <div class="relative border-2 border-dashed border-gray-200 rounded-xl p-12 text-center hover:border-blue-500 transition-all cursor-pointer bg-gray-50">
          <input type="file" accept=".pdf,.docx" @change="onFileChange" class="absolute inset-0 opacity-0 cursor-pointer" />
          <div v-if="isProcessing" class="animate-pulse flex flex-col items-center">
            <div class="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p class="text-xs text-blue-500 font-bold uppercase">Processing File...</p>
          </div>
          <p v-else class="text-gray-500 font-medium">Click to upload PDF or DOCX</p>
        </div>
        
        <div v-if="trackingId" class="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
          <p class="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Document Identity</p>
          <p class="font-mono text-2xl font-black text-blue-700">{{ trackingId }}</p>
          
          <div class="mt-4 flex items-center justify-between">
            
            <button @click="printDocument" class="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase hover:bg-blue-700 transition-colors shadow-lg">
              Print Now
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.docx-wrapper {
  background-color: #f3f4f6 !important;
  padding: 1.5rem !important;
  display: flex !important;
  justify-content: center !important;
}
.docx {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
  margin-bottom: 0 !important;
  background-color: white !important;
  width: 100% !important;
}
</style>