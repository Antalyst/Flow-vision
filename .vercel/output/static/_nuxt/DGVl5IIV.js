import{a as s,b as t,e as r,h as g,w as j,P as q,t as E,m as l,o as n}from"./CaJJUrnM.js";import{P as F,r as I}from"./CKNhXNwM.js";import{Q as N}from"./Cm5gtCyG.js";import"./Cpj98o6Y.js";const O={class:"bg-gray-100 p-6"},S={class:"grid grid-cols-1 lg:grid-cols-2 gap-8 h-[80vh]"},T={class:"bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-gray-200 relative"},z={class:"flex-grow overflow-auto bg-gray-50 relative"},H={key:0,class:"absolute top-8 right-8 z-50 p-1 bg-white shadow-lg border border-gray-200 pointer-events-none"},M=["src"],Q=["data"],W={key:2,class:"h-full flex items-center justify-center text-gray-300 italic text-sm"},$={class:"bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-center"},V={class:"relative border-2 border-dashed border-gray-200 rounded-xl p-12 text-center hover:border-blue-500 transition-all cursor-pointer bg-gray-50"},A={key:0,class:"animate-pulse flex flex-col items-center"},X={key:1,class:"text-gray-500 font-medium"},G={key:0,class:"mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm"},J={class:"font-mono text-2xl font-black text-blue-700"},K={class:"mt-4 flex items-center justify-between"},ae={__name:"index",setup(Y){const _=()=>{const a=l(!1),e=l(null),d=l(""),i=l(""),c=l(null),u=l("");return{processDocument:async o=>{if(!o)return;const f=o.name.split(".");i.value=f.pop().toLowerCase(),a.value=!0;try{d.value=`FLOW-${Math.random().toString(36).substr(2,9).toUpperCase()}`;const p=await o.arrayBuffer();if(u.value=await N.toDataURL(d.value,{margin:1,width:200}),i.value==="pdf"){const h=await F.load(p),B=await h.embedPng(u.value);h.getPages().forEach(y=>{const{width:U,height:R}=y.getSize();y.drawImage(B,{x:U-70,y:R-70,width:50,height:50})});const L=await h.save();e.value=URL.createObjectURL(new Blob([L],{type:"application/pdf"}))}else i.value==="docx"&&(c.value&&(c.value.innerHTML=""),await I(p,c.value),e.value=URL.createObjectURL(new Blob([p],{type:o.type})))}catch(p){console.error(p),alert("Error rendering document")}finally{a.value=!1}},printDocument:()=>{if(i.value==="pdf"){const o=window.open(e.value);o.onload=()=>{o.focus(),o.print()}}else if(i.value==="docx"){const o=window.open("","_blank"),f=c.value.innerHTML;o.document.write(`
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
            <div class="qr-container"><img src="${u.value}" /></div>
            ${f}
          </body>
        </html>
      `),o.document.close(),o.focus(),setTimeout(()=>{o.print(),o.close()},500)}},isProcessing:a,processedUrl:e,trackingId:d,fileExtension:i,wordPreviewContainer:c,qrBase64:u}},{processDocument:k,printDocument:x,isProcessing:D,processedUrl:m,trackingId:w,fileExtension:b,wordPreviewContainer:P,qrBase64:v}=_(),C=a=>{const e=a.target.files[0];e&&k(e)};return(a,e)=>(n(),s("div",O,[t("div",S,[t("div",T,[e[1]||(e[1]=t("div",{class:"p-3 bg-gray-50 border-b font-bold text-xs text-gray-400 uppercase tracking-widest text-center"}," Live Document Preview ",-1)),t("div",z,[r(b)==="docx"&&r(v)?(n(),s("div",H,[t("img",{src:r(v),class:"w-[60px] h-[60px]",alt:"Tracking QR"},null,8,M)])):g("",!0),r(m)&&r(b)==="pdf"?(n(),s("object",{key:1,data:r(m),type:"application/pdf",class:"w-full h-full"},null,8,Q)):g("",!0),j(t("div",{ref_key:"wordPreviewContainer",ref:P,class:"p-4 bg-white min-h-full"},null,512),[[q,r(b)==="docx"]]),r(m)?g("",!0):(n(),s("div",W," No document loaded "))])]),t("div",$,[t("div",V,[t("input",{type:"file",accept:".pdf,.docx",onChange:C,class:"absolute inset-0 opacity-0 cursor-pointer"},null,32),r(D)?(n(),s("div",A,[...e[2]||(e[2]=[t("div",{class:"h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"},null,-1),t("p",{class:"text-xs text-blue-500 font-bold uppercase"},"Processing File...",-1)])])):(n(),s("p",X,"Click to upload PDF or DOCX"))]),r(w)?(n(),s("div",G,[e[3]||(e[3]=t("p",{class:"text-xs font-bold text-blue-400 uppercase tracking-widest mb-1"},"Document Identity",-1)),t("p",J,E(r(w)),1),t("div",K,[t("button",{onClick:e[0]||(e[0]=(...d)=>r(x)&&r(x)(...d)),class:"bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase hover:bg-blue-700 transition-colors shadow-lg"}," Print Now ")])])):g("",!0)])])]))}};export{ae as default};
