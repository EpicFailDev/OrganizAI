import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

const healthApp = new OpenAPIHono();

const HealthSchema = z.object({
  status: z.string().openapi({ example: 'ok' }),
  timestamp: z.string().openapi({ example: '2026-08-08T22:30:00.000Z' }),
  uptime: z.number().openapi({ example: 120.45 }),
  service: z.string().openapi({ example: 'OrganizAI API' }),
}).openapi('HealthStatus');

const healthRoute = createRoute({
  method: 'get',
  path: '/healthz',
  summary: 'Verificação de Saúde da API',
  description: 'Retorna o status atual do serviço backend e tempo de atividade.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: HealthSchema,
        },
      },
      description: 'Serviço operacional',
    },
  },
});

healthApp.openapi(healthRoute, (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'OrganizAI API',
  }, 200);
});

export default healthApp;
