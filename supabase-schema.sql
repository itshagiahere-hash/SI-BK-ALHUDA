create table if not exists public.sibk_users (
  id text primary key,
  username text not null unique,
  password text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'viewer')),
  master boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.sibk_students (
  id text primary key,
  nis text not null,
  name text not null,
  class_name text not null,
  whatsapp text,
  parent text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.sibk_violations (
  id text primary key,
  student_id text not null references public.sibk_students(id) on delete cascade,
  date date not null,
  points integer not null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sibk_achievements (
  id text primary key,
  student_id text not null references public.sibk_students(id) on delete cascade,
  date date not null,
  category text not null,
  level text,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sibk_counseling (
  id text primary key,
  student_id text not null references public.sibk_students(id) on delete cascade,
  date date not null,
  type text not null,
  summary text not null,
  follow_up text,
  status text not null,
  created_at timestamptz not null default now()
);

insert into public.sibk_users (id, username, password, full_name, role, master)
values
  ('u-master', 'admin', 'admin123', 'Guru BK Utama', 'admin', true),
  ('u-viewer', 'wali', 'wali123', 'Wali Kelas', 'viewer', false)
on conflict (id) do nothing;

insert into public.sibk_students (id, nis, name, class_name, whatsapp, parent, address)
values
  ('s-1', '23241001', 'Ahmad Fauzan', 'X IPA 1', '081234567801', 'Bapak Surya', 'Wonogiri'),
  ('s-2', '23241002', 'Nadia Aulia', 'XI IPS 2', '081234567802', 'Ibu Lestari', 'Selogiri'),
  ('s-3', '23241003', 'Rizky Maulana', 'XII IPA 1', '081234567803', 'Bapak Hadi', 'Ngadirojo')
on conflict (id) do nothing;

insert into public.sibk_violations (id, student_id, date, points, note)
values
  ('v-1', 's-1', '2026-05-10', 15, 'Terlambat masuk sekolah tiga kali dalam satu pekan.'),
  ('v-2', 's-3', '2026-05-14', 25, 'Tidak mengikuti kegiatan wajib tanpa keterangan.')
on conflict (id) do nothing;

insert into public.sibk_achievements (id, student_id, date, category, level, description)
values
  ('a-1', 's-2', '2026-05-08', 'Akademis', 'Kabupaten', 'Juara 2 Olimpiade Matematika.')
on conflict (id) do nothing;

insert into public.sibk_counseling (id, student_id, date, type, summary, follow_up, status)
values
  ('c-1', 's-1', '2026-05-16', 'Konsultasi Pribadi', 'Diskusi pengelolaan waktu belajar.', 'Pemantauan selama dua pekan.', 'Dalam Proses')
on conflict (id) do nothing;

alter table public.sibk_users enable row level security;
alter table public.sibk_students enable row level security;
alter table public.sibk_violations enable row level security;
alter table public.sibk_achievements enable row level security;
alter table public.sibk_counseling enable row level security;

drop policy if exists "SI-BK prototype access" on public.sibk_users;
drop policy if exists "SI-BK prototype access" on public.sibk_students;
drop policy if exists "SI-BK prototype access" on public.sibk_violations;
drop policy if exists "SI-BK prototype access" on public.sibk_achievements;
drop policy if exists "SI-BK prototype access" on public.sibk_counseling;

create policy "SI-BK prototype access" on public.sibk_users for all to anon using (true) with check (true);
create policy "SI-BK prototype access" on public.sibk_students for all to anon using (true) with check (true);
create policy "SI-BK prototype access" on public.sibk_violations for all to anon using (true) with check (true);
create policy "SI-BK prototype access" on public.sibk_achievements for all to anon using (true) with check (true);
create policy "SI-BK prototype access" on public.sibk_counseling for all to anon using (true) with check (true);
