# 쉼표정류장 (Chuncheon Bus Stop Care)

고령 시민(B2C)과 춘천시 시설관리(B2G)를 위한 **버스정류장 대기 환경** 플랫폼입니다.

두 서비스는 **서로 다른 애플리케이션 · 서로 다른 오리진**으로 완전히 분리되어 있습니다.

| 앱 | 주소 | 대상 | 인증 |
|----|------|------|------|
| `apps/citizen` | http://localhost:3000 | 시민 (모바일 380~480px) | 없음 (공개) |
| `apps/admin` | http://localhost:3100 | 춘천시 담당자 (데스크톱 ≥1024px) | 필수 |

TAGO / Supabase / VLM 키가 없어도 **Mock 폴백**으로 두 앱 모두 단독 실행됩니다.

---

## 1. 빠른 시작

```bash
# Node.js 18+ 권장
npm install

# 시민 앱(:3000) + 관리자(:3100) 동시 실행
npm run dev
```

한쪽만 띄우려면:

```bash
npm run dev:citizen   # http://localhost:3000
npm run dev:admin     # http://localhost:3100
```

관리자 개발용 기본 비밀번호는 `chuncheon2026`입니다. **배포 전 `ADMIN_PASSWORD`를 반드시 변경하세요.**

### 시민 앱 (:3000)

| 경로 | 용도 |
|------|------|
| `/` | 메인 (길찾기 · 불편사항) |
| `/route` | 길찾기 (방면 안내) |
| `/shelter` | 주변 쉼터 (길찾기 통합 예정) |
| `/report` | 불편사항 사진 제보 |
| `/my-reports` | 내 제보 처리 현황 |

### 관리자 콘솔 (:3100)

| 경로 | 용도 |
|------|------|
| `/login` | 담당자 로그인 |
| `/` | 라이브 제보 피드 |
| `/analytics` | 설치 우선순위 히트맵·로드맵 |

---

## 2. B2C / B2G 분리 구조

같은 서버의 경로만 다른 구조가 아니라, **빌드 산출물과 프로세스가 분리**되어 있습니다.

- 시민 앱 번들에는 관리자 페이지·API 코드가 **존재하지 않습니다.** `:3000/admin`, `:3000/api/stats`는 404입니다.
- 상태 변경(`PATCH /api/reports`)은 관리자 앱에만 있습니다. 시민 앱에서는 405입니다.
- 관리자 앱은 `apps/admin/src/middleware.ts`가 `/login`과 `/api/session`을 제외한 **모든 경로**에 세션을 요구합니다. 비로그인 시 페이지는 307, API는 401입니다.
- 세션은 httpOnly 쿠키(8시간)이며 비밀번호가 아닌 SHA-256 파생 토큰만 담습니다. 비교는 상수 시간입니다.
- 관리자 앱은 `robots.txt`에서 전체 `Disallow`, 메타 태그로 `noindex` 처리됩니다.
- 두 앱 사이에 하이퍼링크가 **한 개도 없습니다.**

운영 배포 시에는 서로 다른 도메인(예: `bus.chuncheon.go.kr` / `admin-bus.chuncheon.go.kr`)에 각각 올리고,
관리자 도메인은 내부망 또는 IP 허용목록 뒤에 두는 것을 권장합니다.

---

## 3. 프로젝트 구조

```
packages/core/           # 두 앱이 공유하는 도메인 로직 (@ccbs/core)
  src/
    types.ts constants.ts geo.ts data.ts format.ts   # 클라이언트 안전
    auth.ts                                           # 세션 파생 (Edge 호환)
    server/                                           # 서버 전용
      tago.ts vlm.ts reports.ts store.ts
    data/                stops.json routes.json cooling_shelters.json

apps/citizen/            # B2C — 포트 3000
  src/app/               /, /route, /shelter, /report, /my-reports
    api/                 stops, arrivals, reports(GET·POST), upload, photos
  src/components/

apps/admin/              # B2G — 포트 3100
  src/middleware.ts      전 경로 세션 게이트
  src/app/               /login, /, /analytics
    api/                 session, stats, reports(PATCH), photos
  src/components/admin/

supabase/schema.sql
```

`@ccbs/core`는 진입점이 셋으로 나뉩니다.

- `@ccbs/core` — 타입·상수·좌표·정류장 데이터 (클라이언트 컴포넌트에서 사용 가능)
- `@ccbs/core/server` — TAGO·VLM·제보 저장소 (Node 전용)
- `@ccbs/core/auth` — 세션 토큰 파생 (Edge 미들웨어 호환)

### 핵심 로직

- **방면 자동 매핑** (`resolveDirections`): 출발·도착 정류장의 정차 순서로 진행 방향을 판정 → `[후평동 방면] 12번`
- **TAGO 폴백** (`server/tago.ts`): 키가 없거나 호출이 실패하면 Mock 도착정보
- **사진 자동 분류** (`server/vlm.ts`): 사진만으로 파손 유형·severity 추정, 미설정 시 분류 대기로 접수
- **정류장 자동 매칭** (`nearestStopTo`): 촬영 좌표에서 가장 가까운 정류장을 서버가 결정 (시민은 정류장을 고르지 않음)
- **군집 긴급** (`applyUrgency`): 동일 유형 + GPS 20m 이내 미해결 제보 3건 이상이면 `is_urgent`

---

## 4. 두 앱의 데이터 공유

프로세스가 분리되었으므로 인메모리 저장소는 쓸 수 없습니다.

- **Supabase가 설정된 경우**: 두 앱 모두 같은 `reports` 테이블과 Storage 버킷을 바라봅니다. (운영 기본값)
- **미설정인 경우**: 저장소 루트의 `.data/` 디렉터리를 공유합니다.
  - `.data/reports.json` — 제보 (원자적 rename으로 기록)
  - `.data/uploads/` — 업로드 사진, 각 앱의 `/api/photos/[key]`가 서빙
  - 경로는 `CCBS_DATA_DIR`로 변경할 수 있습니다.

> 파일 공유는 **로컬 데모 전용**입니다. 두 앱을 다른 서버에 배포한다면 Supabase 설정이 필수입니다.

---

## 5. (선택) 외부 연동

각 앱 폴더의 `.env.example`을 복사합니다.

```bash
cp apps/citizen/.env.example apps/citizen/.env.local
cp apps/admin/.env.example   apps/admin/.env.local
```

| 변수 | 앱 | 없으면 |
|------|----|--------|
| `ADMIN_PASSWORD` | admin | 개발 기본값 `chuncheon2026` |
| `ADMIN_SESSION_SECRET` | admin | 기본 솔트 (운영 시 변경 권장) |
| `TAGO_SERVICE_KEY` | citizen | Mock 도착정보 생성 |
| `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` | 공통 | `.data` 파일 공유 저장소 |
| `VLM_API_URL` + `VLM_API_KEY` | 공통 | 규칙기반 Mock 태깅 |

### Supabase 설정

1. 프로젝트 생성 후 SQL Editor에서 `supabase/schema.sql` 실행
2. Storage에 `report-photos` 버킷 생성 (Public)
3. **두 앱 모두**의 `.env.local`에 같은 URL / Key 입력

---

## 6. B2C UX 원칙

- 춘천시 도시브랜드 지정색 사용 (그라데이션 사용 안 함)
  - 기본색상 **PANTONE 299 C `#00A3E0`** — 춘천시 도시브랜드 기본색상
  - 남색 **PANTONE 2748 C `#001871`** — 춘천시기 로고타입 색상
  - 출처: 춘천시청 「도시브랜드」 안내 (chuncheon.go.kr) / Pantone sRGB 근사값
- 기준 기기 **갤럭시 S24 CSS 뷰포트 360 × 780** (물리 1080 × 2340, DPR 3) 고정
- 안전영역: 상단 알림바 **24dp**, 하단 네비게이션 바 **48dp** (AOSP `status_bar_height` / `navigation_bar_height`, 3버튼 기준. 제스처 내비게이션은 24dp) — 노란색으로 표시
- 본문 **최소 20px**, 터치 영역 **≥48px**
- 아이콘 없이 **글자만** 사용, 화면에 설명용 문구를 넣지 않음
- Web Speech API 기반 **음성 검색** (Chrome/Edge)

관리자 콘솔은 정보 밀도를 우선해 별도 Tailwind 스케일을 사용합니다.

---

## 7. 스크립트

```bash
npm run dev          # 두 앱 동시 개발 서버
npm run dev:citizen  # 시민 앱만
npm run dev:admin    # 관리자만
npm run build        # 두 앱 순차 빌드
npm run start        # 두 앱 프로덕션 동시 실행
npm run typecheck    # 전 워크스페이스 타입 검사
```

---

## 8. 데모 시나리오

1. `:3000/route`에서 출발 **춘천역**, 도착 **후평동주공아파트** → `[후평동 방면] 12번` 카드 확인
2. `:3000/shelter`에서 **중앙로터리** → 30m 안 스마트쉼터 + 시설 5종 상태
3. `:3000/report`에서 사진 촬영 후 보내기 (위치·시각 자동 첨부)
4. `:3100/login` 로그인 → 피드에 5초 내 반영, 좌표·시각·자동 매칭 정류장 확인
5. 다시 `:3000/my-reports` → 처리 상태 동기화 확인
6. `:3100/analytics`에서 설치 우선순위 히트맵 확인
