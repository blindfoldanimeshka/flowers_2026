import { NextRequest, NextResponse } from 'next/server';
import { basename, normalize } from 'path';
import { withErrorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';

const STORAGE_BUCKET_CANDIDATES = Array.from(
  new Set(
    [process.env.SUPABASE_STORAGE_BUCKET_PRODUCTS, process.env.SUPABASE_STORAGE_BUCKET, 'product-images'].filter(
      (value): value is string => Boolean(value && value.trim())
    )
  )
);

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) => {
  const resolvedParams = await params;
  const parts = resolvedParams.path || [];
  const filePath = parts.join('/');
  const normalizedPath = normalize(filePath).replace(/^([/\\])+/, '');

  console.log('[UPLOADS] Requested path:', filePath);
  console.log('[UPLOADS] Normalized path:', normalizedPath);

  if (!filePath || normalizedPath.includes('..')) {
    console.log('[UPLOADS] Invalid path, returning 404');
    return new NextResponse('File not found', { status: 404 });
  }

  const storageCandidates = Array.from(
    new Set([normalizedPath, safeDecode(normalizedPath), basename(normalizedPath), safeDecode(basename(normalizedPath))])
  );

  console.log('[UPLOADS] Storage candidates:', storageCandidates);
  console.log('[UPLOADS] Buckets to check:', STORAGE_BUCKET_CANDIDATES);

  let fileBuffer: Buffer | null = null;
  let extension = normalizedPath.split('.').pop()?.toLowerCase();

  for (const bucket of STORAGE_BUCKET_CANDIDATES) {
    for (const storagePath of storageCandidates) {
      console.log(`[UPLOADS] Trying bucket: ${bucket}, path: ${storagePath}`);
      const { data, error } = await supabase.storage.from(bucket).download(storagePath);
      if (error) {
        console.log(`[UPLOADS] Error downloading from ${bucket}/${storagePath}:`, error.message);
      }
      if (!error && data) {
        console.log(`[UPLOADS] Successfully downloaded from ${bucket}/${storagePath}`);
        const arrayBuffer = await data.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        extension = storagePath.split('.').pop()?.toLowerCase();
        break;
      }
    }
    if (fileBuffer) break;
  }

  if (!fileBuffer) {
    console.log('[UPLOADS] File not found in any bucket, returning 404');
    return new NextResponse('Image not found', { status: 404 });
  }

  console.log(`[UPLOADS] Returning file, size: ${fileBuffer.length}, type: ${extension}`);

  let contentType = 'application/octet-stream';
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      contentType = 'image/jpeg';
      break;
    case 'png':
      contentType = 'image/png';
      break;
    case 'webp':
      contentType = 'image/webp';
      break;
    case 'gif':
      contentType = 'image/gif';
      break;
    case 'svg':
      contentType = 'image/svg+xml';
      break;
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(fileBuffer.length),
    },
  });
});
