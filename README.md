# Place Basic - Fastify + ioredis

Cloudflare Worker의 place-basic을 Fastify + ioredis + fetch로 구현한 버전입니다.

## 주요 기능

- 네이버 플레이스 검색 결과 크롤링
- Redis를 이용한 캐싱 (TTL: 1시간)
- 백그라운드 캐시 재검증
- CORS 지원

## 기술 스택

- **Fastify**: 고성능 Node.js 웹 프레임워크
- **ioredis**: Redis 클라이언트
- **fetch**: HTTP 요청 (undici)
- **TypeScript**: 타입 안정성

## 설치

```bash
npm install
```

## 환경 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 필요한 값을 설정하세요:

```bash
cp .env.example .env
```

### 환경 변수

- `PORT`: 서버 포트 (기본값: 3000)
- `HOST`: 서버 호스트 (기본값: 0.0.0.0)
- `REDIS_HOST`: Redis 호스트 (기본값: localhost)
- `REDIS_PORT`: Redis 포트 (기본값: 6379)
- `REDIS_PASSWORD`: Redis 비밀번호 (선택사항)
- `REDIS_DB`: Redis 데이터베이스 번호 (기본값: 0)

## 실행

### 개발 모드

```bash
npm run dev
```

### 프로덕션 빌드

```bash
npm run build
npm start
```

### PM2로 실행 (프로덕션 환경)

PM2를 사용하면 백그라운드에서 안정적으로 실행할 수 있습니다.

```bash
# PM2 설치 (최초 1회)
npm install -g pm2

# 실행
npm run pm2

# 상태 확인
pm2 list

# 로그 확인
npm run pm2:logs

# 재시작
npm run pm2:restart

# 중지
npm run pm2:stop

# 삭제
npm run pm2:delete
```

**또는 더 간단하게:**

```bash
# TypeScript 직접 실행
pm2 start src/index.ts --name place-basic --interpreter node --interpreter-args '--import tsx'

# 또는 빌드 후 실행
npm run build
pm2 start dist/index.js --name place-basic
```

## API 사용법

### POST /

네이버 플레이스 검색 결과를 가져옵니다.

**요청 (Form Data)**

```
keyword: 검색 키워드 (필수)
limit: 결과 개수 (선택, 기본값: 50, 최대: 300)
```

**응답 예시**

```json
{
  "code": "0000",
  "type": "action",
  "result": [
    {
      "id": "123456",
      "gdid": "789012",
      "name": "상호명",
      "category": "카테고리",
      "categoryCodeList": "code1,code2",
      "visitorReviewScore": "4.5",
      "blogCafeReviewCount": 100,
      "visitorReviewCount": 50,
      "saveCount": 20,
      "newOpening": "",
      "roadAddress": "도로명 주소",
      "imageUrl": "이미지 URL",
      "placeTotalCount": "1,234",
      "rank": 1
    }
  ]
}
```

### GET /health

서버 상태를 확인합니다.

**응답**

```json
{
  "status": "ok",
  "timestamp": "2025-11-09T12:00:00.000Z"
}
```

## curl 예시

```bash
# 플레이스 검색
curl -X POST http://localhost:3000/ \
  -d "keyword=강남역 맛집" \
  -d "limit=50"

# Health check
curl http://localhost:3000/health
```

## 캐싱 전략

- Redis를 사용하여 검색 결과를 1시간 동안 캐싱
- 캐시가 만료되면 백그라운드에서 자동으로 재검증
- 캐시 키 형식: `place:{keyword}:{limit}`

## 주요 차이점 (Cloudflare Worker vs Fastify)

| 항목 | Cloudflare Worker | Fastify |
|------|------------------|---------|
| 캐시 스토리지 | KV Namespace | Redis (ioredis) |
| HTTP 프레임워크 | 빌트인 | Fastify |
| 실행 환경 | Edge Runtime | Node.js |
| 배포 | Wrangler CLI | Docker, PM2 등 |

## 라이센스

ISC
