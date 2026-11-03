import { z } from '@/lib/zod'
import { UPLOAD_PURPOSES } from '@/server/db/schema'

export const createUploadSchema = z.object({
  purpose: z.enum(UPLOAD_PURPOSES),
  filename: z.string({ error: 'fileRequired' }).trim().min(1, 'fileRequired').max(200, 'fileRequired'),
  contentType: z.string().max(100).default('application/octet-stream'),
  bytes: z.number({ error: 'fileRequired' }).int().min(1, 'fileRequired'),
})
export type CreateUploadInput = z.infer<typeof createUploadSchema>
