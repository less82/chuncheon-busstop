-- 춘천 버스정류장 케어 플랫폼 — Supabase 스키마
-- SQL Editor에서 한 번 실행하세요. (선택 사항 — 미설정 시 인메모리 Mock 사용)

create extension if not exists "pgcrypto";

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  -- 촬영 좌표로 자동 매칭한 최근접 정류장
  stop_id text not null default '',
  stop_name text not null default '위치 미확인',
  -- 사진 자동 분류 결과 (분류 전 null)
  category text check (category in ('glass', 'light', 'bench', 'bit', 'shade')),
  photo_url text,
  lat double precision,
  lng double precision,
  captured_at timestamptz not null default now(),
  vlm_tags text[],
  is_urgent boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists reports_stop_id_idx on public.reports (stop_id);
create index if not exists reports_status_idx on public.reports (status);
create index if not exists reports_is_urgent_idx on public.reports (is_urgent);

-- Storage 버킷: Dashboard > Storage > New bucket > "report-photos" (Public)
-- 또는:
-- insert into storage.buckets (id, name, public) values ('report-photos', 'report-photos', true);

alter table public.reports enable row level security;

-- 데모용: 익명 읽기/쓰기 허용 (운영 시 서비스롤 + Auth 정책으로 교체)
create policy "reports_select_anon" on public.reports for select using (true);
create policy "reports_insert_anon" on public.reports for insert with check (true);
create policy "reports_update_anon" on public.reports for update using (true);
