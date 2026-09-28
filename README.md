# 동아리 투표

동아리 안에서 쓰는 간단한 투표 앱이다. 운영자가 투표(질문 하나, 선택지, 마감 시각)를 올리면, 동아리원은 로그인 없이 선택지 하나를 골라 표를 던지고 결과를 본다.

- 용어: [CONTEXT.md](CONTEXT.md)
- 설계 결정: [docs/adr/](docs/adr/)
- 스펙과 티켓: [.scratch/club-voting/](.scratch/club-voting/)

Next.js 16(App Router), Neon Postgres, Vercel로 만든다.

## 준비

1. 의존성을 설치한다.

   ```bash
   npm install
   ```

2. `.env.example`을 `.env.local`로 복사하고 값을 채운다.
   - `DATABASE_URL`: Neon 연결 주소
   - `ADMIN_PASSWORD`: 운영자 비밀번호
   - `SESSION_SECRET`: 32자 이상의 무작위 문자열

3. Neon에 스키마를 적용한다. 처음 한 번만 하면 되고, 다시 해도 안전하다.

   ```bash
   npm run db:apply-schema
   ```

## 개발

`DATABASE_URL`을 비워 두면 개발 모드에서는 Neon 대신 `.pglite/` 폴더의 로컬 Postgres(PGlite)를 쓴다. Neon 계정 없이 화면을 확인할 수 있다. 로컬 데이터를 지우려면 `.pglite/` 폴더를 지운다.

```bash
npm run dev        # http://localhost:3000
npm test           # 테스트 (PGlite를 써서 Neon 없이 돈다)
npm run typecheck  # 타입 검사
npm run lint
```

## 배포 (Vercel)

1. GitHub 저장소를 Vercel 프로젝트에 연결한다.
2. Vercel 프로젝트 설정의 환경변수에 `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`를 넣는다.
3. 배포에 쓰는 Neon DB에 위의 스키마 적용을 한 번 해 둔다.
