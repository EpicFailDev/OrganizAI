import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getDb } from '../lib/request-context.js';
import type { AppEnv } from '../lib/request-context.js';
import {
  ProfileSchema,
  MyFamilySchema,
  FamilyMemberSchema,
  FamilyGroupSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';

const familyApp = new OpenAPIHono<AppEnv>();

// GET /v1/profile/:userId
const getProfileRoute = createRoute({
  method: 'get',
  path: '/v1/profile/{userId}',
  summary: 'Obter Perfil',
  description: 'Retorna o perfil de um usuário (nome, avatar, profissão).',
  request: {
    params: z.object({
      userId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ProfileSchema,
        },
      },
      description: 'Perfil recuperado com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao buscar perfil',
    },
  },
});

familyApp.openapi(getProfileRoute, async (c) => {
  const db = getDb(c);
  const { userId } = c.req.valid('param');

  const { data, error } = await db
    .from('profiles')
    .select('id, display_name, avatar_url, profession')
    .eq('id', userId)
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 200);
});

// PATCH /v1/profile/:userId
const updateProfileRoute = createRoute({
  method: 'patch',
  path: '/v1/profile/{userId}',
  summary: 'Atualizar Perfil',
  description: 'Atualiza o nome de exibição e a profissão do próprio perfil.',
  request: {
    params: z.object({
      userId: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            display_name: z.string().min(1).optional(),
            profession: z.string().nullable().optional(),
            avatar_url: z.string().nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ProfileSchema,
        },
      },
      description: 'Perfil atualizado com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao atualizar perfil',
    },
  },
});

familyApp.openapi(updateProfileRoute, async (c) => {
  const db = getDb(c);
  const { userId } = c.req.valid('param');
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('profiles')
    .update(body)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 200);
});

// GET /v1/me/family
const getMyFamilyRoute = createRoute({
  method: 'get',
  path: '/v1/me/family',
  summary: 'Obter Minha Família',
  description: 'Retorna a associação familiar do usuário logado, com os dados do grupo.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: MyFamilySchema.nullable(),
        },
      },
      description: 'Associação familiar recuperada com sucesso',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Não autenticado',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao buscar associação familiar',
    },
  },
});

familyApp.openapi(getMyFamilyRoute, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');

  const { data, error } = await db
    .from('family_members')
    .select('*, family_groups(*)')
    .eq('profile_id', userId)
    .maybeSingle();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data || null, 200);
});

// GET /v1/family/:familyId/members
const listMembersRoute = createRoute({
  method: 'get',
  path: '/v1/family/{familyId}/members',
  summary: 'Listar Membros da Família',
  description: 'Retorna os integrantes do grupo familiar, com seus perfis.',
  request: {
    params: z.object({
      familyId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(FamilyMemberSchema),
        },
      },
      description: 'Membros recuperados com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao buscar membros',
    },
  },
});

familyApp.openapi(listMembersRoute, async (c) => {
  const db = getDb(c);
  const { familyId } = c.req.valid('param');

  const { data, error } = await db
    .from('family_members')
    .select('*, profiles(display_name, avatar_url)')
    .eq('family_id', familyId)
    .order('joined_at', { ascending: true });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data || [], 200);
});

// POST /v1/family
const createFamilyRoute = createRoute({
  method: 'post',
  path: '/v1/family',
  summary: 'Criar Grupo Familiar',
  description: 'Cria um novo grupo familiar e insere o usuário logado como administrador.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({ family_id: z.string().uuid() }),
        },
      },
      description: 'Grupo familiar criado com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao criar grupo familiar',
    },
  },
});

familyApp.openapi(createFamilyRoute, async (c) => {
  const db = getDb(c);
  const { name } = c.req.valid('json');

  const { data, error } = await db.rpc('create_family', { p_name: name });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ family_id: data }, 201);
});

// POST /v1/family/join
const joinFamilyRoute = createRoute({
  method: 'post',
  path: '/v1/family/join',
  summary: 'Participar de Grupo Familiar',
  description: 'Ingressa em um grupo familiar existente via código de convite.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            invite_code: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: 'Ingresso realizado com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao ingressar no grupo familiar',
    },
  },
});

familyApp.openapi(joinFamilyRoute, async (c) => {
  const db = getDb(c);
  const { invite_code } = c.req.valid('json');

  const { error } = await db.rpc('join_family', { p_invite_code: invite_code });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true, message: 'Ingresso realizado com sucesso' }, 200);
});

// DELETE /v1/family/:familyId/members/:profileId
const leaveFamilyRoute = createRoute({
  method: 'delete',
  path: '/v1/family/{familyId}/members/{profileId}',
  summary: 'Sair do Grupo Familiar',
  description: 'Remove um membro do grupo familiar (sair do grupo).',
  request: {
    params: z.object({
      familyId: z.string().uuid(),
      profileId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: 'Membro removido com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao remover membro',
    },
  },
});

familyApp.openapi(leaveFamilyRoute, async (c) => {
  const db = getDb(c);
  const { familyId, profileId } = c.req.valid('param');

  const { error } = await db
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('profile_id', profileId);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true, message: 'Membro removido do grupo' }, 200);
});

// GET /v1/family/:familyId
const getFamilyRoute = createRoute({
  method: 'get',
  path: '/v1/family/{familyId}',
  summary: 'Obter Grupo Familiar',
  description: 'Retorna os dados do grupo familiar (nome, código de convite).',
  request: {
    params: z.object({
      familyId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: FamilyGroupSchema,
        },
      },
      description: 'Grupo familiar recuperado com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao buscar grupo familiar',
    },
  },
});

familyApp.openapi(getFamilyRoute, async (c) => {
  const db = getDb(c);
  const { familyId } = c.req.valid('param');

  const { data, error } = await db
    .from('family_groups')
    .select('*')
    .eq('id', familyId)
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 200);
});

export default familyApp;
