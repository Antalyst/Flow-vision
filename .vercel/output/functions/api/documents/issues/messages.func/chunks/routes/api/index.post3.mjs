import { d as defineEventHandler, x as readMultipartFormData, c as createError, z as extractTextFromFile, A as analyzeDocument } from '../../_/nitro.mjs';
import 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'mysql2/promise';
import '@iconify/utils';
import 'consola';
import 'node:fs';
import 'node:path';

const index_post = defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event);
  const file = formData == null ? void 0 : formData.find((item) => item.name === "file" && item.filename);
  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: "No file provided." });
  }
  try {
    const text = await extractTextFromFile({
      filename: file.filename || "",
      data: file.data
    });
    if (text.length < 5) {
      throw new Error("Document content is too short or unreadable.");
    }
    return await analyzeDocument(text);
  } catch (err) {
    console.error("[ping] Error:", err.message);
    throw createError({ statusCode: 500, message: err.message });
  }
});

export { index_post as default };
//# sourceMappingURL=index.post3.mjs.map
