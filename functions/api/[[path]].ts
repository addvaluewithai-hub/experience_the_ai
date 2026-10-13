import { handleRequest } from '../../apps/platform/server/app';
import type { Env } from '../../apps/platform/server/env';
export const onRequest = ({ request, env }: { request: Request; env: Env }) =>
  handleRequest(request, env);
