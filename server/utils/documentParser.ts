// server/utils/documentParser.ts
import mammoth from 'mammoth';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export const extractTextFromFile = async (file: { filename: string, data: Buffer }) => {
  const filename = file.filename.toLowerCase();
  let text = '';

  try {
    if (filename.endsWith('.pdf')) {
      const data = await pdf(file.data);
      text = data.text;
    } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
      const result = await mammoth.extractRawText({ buffer: file.data });
      text = result.value;
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      // Hard fallback for Excel binary to prevent reading raw zip garbage
      text = `Excel Spreadsheet Document titled: ${file.filename}. Contains structured spreadsheet ledger metrics.`;
    } else {
      // Safe string conversion for genuine plain text files (.txt, .csv, .json)
      text = file.data.toString('utf-8');
    }
  } catch (parseError) {
    console.warn(`Parser failed to read text contents for ${filename}, falling back to metadata description.`);
    text = `Document File Name: ${file.filename}`;
  }

  // Clean layout spacing and safely slice context payload
  return text.replace(/\s+/g, ' ').trim().substring(0, 4000); // Lowered to 4k to save token budget
};