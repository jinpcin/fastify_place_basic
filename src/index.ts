import Fastify from 'fastify';
import cors from '@fastify/cors';
import formBody from '@fastify/formbody';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';
import { place } from './service/place.js';

// 환경 변수 로드
dotenv.config();

const fastify = Fastify({
  logger: true
});

// Redis 클라이언트 생성
const redis = new Redis({
  host: process.env.REDIS_HOST || 'host.docker.internal',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  console.log('Redis에 연결되었습니다.');
});

redis.on('error', (err: Error) => {
  console.error('Redis 연결 오류:', err);
});

// CORS 플러그인 등록
await fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS']
});

// Form body 파서 플러그인 등록
await fastify.register(formBody);

// Health check 엔드포인트
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Place API 엔드포인트
fastify.post('/', async (request, reply) => {
  try {
    const body = request.body as any;
    const keyword = body.keyword as string;
    const limit = parseInt(body.limit || '50');

    if (!keyword) {
      return reply.code(400).send({
        code: '9999',
        type: 'alert',
        msg: 'keyword 파라미터가 필요합니다.'
      });
    }

    const result = await place(keyword, limit, 0, 0, redis);

    return reply.send(result);
  } catch (error: any) {
    fastify.log.error(error);
    return reply.code(500).send({
      code: '9999',
      type: 'alert',
      msg: error.message
    });
  }
});

// 서버 시작
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    console.log(`✨ Fastify 서버가 http://${host}:${port} 에서 실행 중입니다.`);
  } catch (err) {
    fastify.log.error(err);
    await redis.quit();
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('서버를 종료합니다...');
  try {
    await redis.quit();
    await fastify.close();
    console.log('서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  } catch (err) {
    console.error('종료 중 오류 발생:', err);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
