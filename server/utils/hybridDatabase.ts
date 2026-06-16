// server/utils/hybridDatabase.ts
import { SupabaseClient } from '@supabase/supabase-js';

// Assuming extractTextFromFile is globally declared or imported from your custom workspace path
// import { extractTextFromFile } from './extractor'; 

export interface QueryFilters {
  years?: number[];
  additionalConditions?: string | null;
  documentType?: string | null;
  org_id?: string | null;
}

export async function fetchAndHydrateDocuments(
  supabase: SupabaseClient, 
  mysqlDb: any, 
  filters: QueryFilters
) {
  try {
    // STEP 1: Core Search via Supabase (PostgreSQL Layer)
    let query = supabase.from('documents').select('*');

    if (filters.org_id) {
      query = query.eq('org_id', filters.org_id);
    }

    // Build flexible textual lookup parameters combining extracted metadata contexts
    const searchKeyword = filters.documentType || filters.additionalConditions;
    if (searchKeyword) {
      query = query.or(`title.ilike.%${searchKeyword}%,description.ilike.%${searchKeyword}%`);
    }

    const { data: metadataRecords, error: sbError } = await query;
    if (sbError) throw sbError;
    if (!metadataRecords || metadataRecords.length === 0) return [];

    // Apply calendar year filters programmatically
    let matchedDocs = metadataRecords;
    if (filters.years && filters.years.length > 0) {
      matchedDocs = metadataRecords.filter((doc: any) => {
        if (!doc.created_at) return false;
        const docYear = new Date(doc.created_at).getFullYear();
        return filters.years!.includes(docYear);
      });
    }

    // STEP 2: Cross-Database Hydration Loop (Hostinger MySQL Cluster Layer)
    // Slice down to 5 records max to stay safely within Groq context/token constraints
    const hydratedDocuments = await Promise.all(
      matchedDocs.slice(0, 5).map(async (doc: any) => {
        if (!doc.mysql_storage_id) {
          return { ...doc, actualFileTextContent: 'No physical binary storage allocation link found.' };
        }

        try {
          // Pull raw binary chunk data
          const [rows]: any = await mysqlDb.execute(
            'SELECT file_blob, file_name FROM document_storage WHERE id = ?',
            [doc.mysql_storage_id]
          );

          if (rows && rows.length > 0) {
            const mysqlRecord = rows[0];
            
            // Execute physical byte stream parser utility tool
            // @ts-ignore
            const rawExtractedText = await extractTextFromFile({
              filename: mysqlRecord.file_name,
              data: mysqlRecord.file_blob
            });

            return {
              ...doc,
              actualFileTextContent: rawExtractedText
            };
          }
        } catch (mysqlErr) {
          console.error(`Hostinger MySQL BLOB extraction failed for document storage pointer ID ${doc.mysql_storage_id}:`, mysqlErr);
        }
        
        return { ...doc, actualFileTextContent: 'Physical document contents are unreadable.' };
      })
    );

    return hydratedDocuments;
  } catch (error) {
    console.error('Multi-Database Hybrid Hydration Engine Exception:', error);
    return [];
  }
}