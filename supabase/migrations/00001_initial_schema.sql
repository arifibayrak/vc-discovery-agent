-- VC Discovery Agent - Initial Schema
-- Migration: 00001_initial_schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enum types
create type submission_status as enum (
  'draft',
  'submitted',
  'extracting',
  'extracted',
  'validating',
  'validated',
  'follow_up_pending',
  'follow_up_received',
  'summarizing',
  'completed',
  'failed'
);

create type file_type as enum (
  'pitch_deck',
  'financial_model',
  'cap_table',
  'other'
);

create type extraction_status as enum (
  'pending',
  'processing',
  'completed',
  'failed'
);

create type question_status as enum (
  'pending',
  'answered',
  'skipped'
);

-- Submissions table: core entity representing a startup's application
create table submissions (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_email text not null,
  contact_name text not null,
  status submission_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Uploaded files: metadata for files stored in Supabase Storage
create table uploaded_files (
  id uuid primary key default uuid_generate_v4(),
  submission_id uuid not null references submissions(id) on delete cascade,
  file_type file_type not null default 'other',
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

-- Extracted data: structured data pulled from uploaded documents
create table extracted_data (
  id uuid primary key default uuid_generate_v4(),
  submission_id uuid not null references submissions(id) on delete cascade,
  file_id uuid references uploaded_files(id) on delete set null,
  status extraction_status not null default 'pending',
  -- Core extracted fields
  industry text,
  stage text,
  funding_ask_usd bigint,
  revenue_annual_usd bigint,
  burn_rate_monthly_usd bigint,
  team_size integer,
  founded_year integer,
  location text,
  problem_statement text,
  solution_description text,
  target_market text,
  business_model text,
  traction_summary text,
  competitive_landscape text,
  use_of_funds text,
  -- Raw extraction output for debugging
  raw_extraction jsonb,
  error_message text,
  extracted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Validation results: deterministic rule checks on extracted data
create table validation_results (
  id uuid primary key default uuid_generate_v4(),
  submission_id uuid not null references submissions(id) on delete cascade,
  extracted_data_id uuid not null references extracted_data(id) on delete cascade,
  field_name text not null,
  rule_name text not null,
  passed boolean not null,
  message text not null,
  severity text not null default 'warning' check (severity in ('error', 'warning', 'info')),
  created_at timestamptz not null default now()
);

-- Follow-up questions: generated based on missing/invalid data
create table follow_up_questions (
  id uuid primary key default uuid_generate_v4(),
  submission_id uuid not null references submissions(id) on delete cascade,
  question text not null,
  context text,
  field_name text,
  status question_status not null default 'pending',
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

-- Investor summaries: final generated output for VC review
create table investor_summaries (
  id uuid primary key default uuid_generate_v4(),
  submission_id uuid not null references submissions(id) on delete cascade,
  executive_summary text not null,
  strengths jsonb not null default '[]',
  risks jsonb not null default '[]',
  key_metrics jsonb not null default '{}',
  recommendation text,
  score integer check (score >= 0 and score <= 100),
  generated_at timestamptz not null default now()
);

-- Indexes
create index idx_uploaded_files_submission on uploaded_files(submission_id);
create index idx_extracted_data_submission on extracted_data(submission_id);
create index idx_validation_results_submission on validation_results(submission_id);
create index idx_follow_up_questions_submission on follow_up_questions(submission_id);
create index idx_investor_summaries_submission on investor_summaries(submission_id);
create index idx_submissions_status on submissions(status);
create index idx_submissions_created_at on submissions(created_at desc);

-- Updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger submissions_updated_at
  before update on submissions
  for each row execute function update_updated_at_column();
