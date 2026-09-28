# 09: Vercel 배포

**What to build:** 동아리원이 실제로 쓸 수 있도록 앱을 Vercel에 배포하고 Neon DB에 연결한다. 계정, 대시보드, 비밀값을 다루므로 사람이 직접 한다. 스펙의 "Further Notes".

**Blocked by:** 06 (첫 화면 투표 목록), 07 (마감 시각 바꾸기), 08 (투표 삭제)

**Status:** ready-for-human

- [ ] Neon 프로젝트가 있고, README의 방법대로 스키마 SQL을 한 번 적용했다
- [ ] Vercel 프로젝트에 `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET` 환경변수를 넣었다. `SESSION_SECRET`은 충분히 긴 무작위 값이다
- [ ] 배포가 성공하고, 배포된 주소에서 운영자 로그인 → 투표 만들기 → 다른 기기로 표 던지기 → 결과 확인 → 마감 시각 바꾸기 → 삭제를 한 번씩 직접 확인했다
- [ ] 운영자 비밀번호를 운영진에게만 전달했다
