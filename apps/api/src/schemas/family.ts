import { z } from '@hono/zod-openapi';

// ----------------------------------------------------
// Perfil e Família
// ----------------------------------------------------
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  profession: z.string().nullable().optional(),
  created_at: z.string().optional(),
}).openapi('Profile');

export const FamilyGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  invite_code: z.string().nullable().optional(),
  created_at: z.string().optional(),
}).openapi('FamilyGroup');

export const FamilyMemberSchema = z.object({
  family_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  role: z.string(),
  joined_at: z.string(),
  profiles: z.object({
    display_name: z.string(),
    avatar_url: z.string().nullable().optional(),
  }).nullable().optional(),
}).openapi('FamilyMember');

export const MyFamilySchema = z.object({
  family_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  role: z.string(),
  joined_at: z.string(),
  family_groups: FamilyGroupSchema.nullable().optional(),
}).openapi('MyFamily');
