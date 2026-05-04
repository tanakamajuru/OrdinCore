--
-- PostgreSQL database dump
--

\restrict 9Sy5TjZtUXNaMIRXuRIuXsLgtWZOTJzOXd6Pypzu0bLqJwK4nA8zGvpINQLm8px

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: cluster_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cluster_status AS ENUM (
    'Emerging',
    'Confirmed',
    'Resolved',
    'Escalated'
);


ALTER TYPE public.cluster_status OWNER TO postgres;

--
-- Name: daily_review_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.daily_review_type AS ENUM (
    'Primary',
    'Deputy Cover',
    'Director Override'
);


ALTER TYPE public.daily_review_type OWNER TO postgres;

--
-- Name: escalation_level; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.escalation_level AS ENUM (
    'No escalation',
    'None',
    'Manager Review',
    'Manager review',
    'Urgent Review',
    'Urgent review',
    'Immediate Escalation',
    'Immediate escalation'
);


ALTER TYPE public.escalation_level OWNER TO postgres;

--
-- Name: happened_before; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.happened_before AS ENUM (
    'Yes',
    'No',
    'Unsure'
);


ALTER TYPE public.happened_before OWNER TO postgres;

--
-- Name: medication_error_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.medication_error_type AS ENUM (
    'Near Miss',
    'Administration Error',
    'Serious Error'
);


ALTER TYPE public.medication_error_type OWNER TO postgres;

--
-- Name: pattern_concern; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.pattern_concern AS ENUM (
    'None',
    'Possible',
    'Possible repeat',
    'Clear',
    'Clear repeat',
    'Escalating'
);


ALTER TYPE public.pattern_concern OWNER TO postgres;

--
-- Name: review_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.review_status AS ENUM (
    'New',
    'Reviewed',
    'Closed',
    'Monitoring',
    'Linked'
);


ALTER TYPE public.review_status OWNER TO postgres;

--
-- Name: severity_level; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.severity_level AS ENUM (
    'Low',
    'Moderate',
    'High',
    'Critical'
);


ALTER TYPE public.severity_level OWNER TO postgres;

--
-- Name: signal_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.signal_type AS ENUM (
    'Incident',
    'Concern',
    'Observation',
    'Safeguarding',
    'Medication',
    'Staffing',
    'Environment',
    'Positive',
    'Positive signal'
);


ALTER TYPE public.signal_type OWNER TO postgres;

--
-- Name: threshold_output_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.threshold_output_type AS ENUM (
    'Signal Flag',
    'Risk Proposal',
    'Mandatory Review',
    'Risk Review Required',
    'Control Failure'
);


ALTER TYPE public.threshold_output_type OWNER TO postgres;

--
-- Name: trajectory_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.trajectory_type AS ENUM (
    'Improving',
    'Stable',
    'Deteriorating',
    'Critical'
);


ALTER TYPE public.trajectory_type OWNER TO postgres;

--
-- Name: refresh_stability(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_stability() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY service_unit_stability; RETURN NULL; END; $$;


ALTER FUNCTION public.refresh_stability() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    executed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public._migrations OWNER TO postgres;

--
-- Name: _migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public._migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public._migrations_id_seq OWNER TO postgres;

--
-- Name: _migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public._migrations_id_seq OWNED BY public._migrations.id;


--
-- Name: action_effectiveness; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.action_effectiveness (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_id uuid NOT NULL,
    risk_id uuid,
    company_id uuid NOT NULL,
    house_id uuid NOT NULL,
    risk_domain character varying(50),
    outcome character varying(20) NOT NULL,
    calculated_at timestamp with time zone DEFAULT now(),
    data jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.action_effectiveness OWNER TO postgres;

--
-- Name: addendums; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.addendums (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    parent_type character varying(30) NOT NULL,
    parent_id uuid NOT NULL,
    content text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT addendums_parent_type_check CHECK (((parent_type)::text = ANY ((ARRAY['pulse'::character varying, 'risk'::character varying, 'escalation_decision'::character varying, 'weekly_review'::character varying, 'monthly_report'::character varying, 'incident_reconstruction'::character varying, 'governance_health_check'::character varying])::text[])))
);


ALTER TABLE public.addendums OWNER TO postgres;

--
-- Name: analytics_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analytics_snapshots (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    snapshot_date date NOT NULL,
    total_risks integer DEFAULT 0,
    open_risks integer DEFAULT 0,
    resolved_risks integer DEFAULT 0,
    critical_risks integer DEFAULT 0,
    total_incidents integer DEFAULT 0,
    open_incidents integer DEFAULT 0,
    governance_compliance_rate numeric(5,2) DEFAULT 0,
    total_escalations integer DEFAULT 0,
    resolved_escalations integer DEFAULT 0,
    house_count integer DEFAULT 0,
    user_count integer DEFAULT 0,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.analytics_snapshots OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid,
    user_id uuid,
    action character varying(150) NOT NULL,
    resource character varying(100) NOT NULL,
    resource_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    entity_type character varying(30) DEFAULT 'entity'::character varying NOT NULL,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    domain character varying(255),
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    plan character varying(50) DEFAULT 'starter'::character varying NOT NULL,
    logo_url text,
    address text,
    phone character varying(50),
    email character varying(255),
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT companies_plan_check CHECK (((plan)::text = ANY ((ARRAY['starter'::character varying, 'professional'::character varying, 'enterprise'::character varying])::text[]))),
    CONSTRAINT companies_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying, 'archived'::character varying])::text[])))
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: control_failure_flags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.control_failure_flags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    service_id uuid NOT NULL,
    risk_id uuid,
    failure_type character varying(50) NOT NULL,
    threshold_trigger text NOT NULL,
    detected_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    resolved_by uuid,
    resolution_note text
);


ALTER TABLE public.control_failure_flags OWNER TO postgres;

--
-- Name: daily_governance_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_governance_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    house_id uuid NOT NULL,
    review_date date NOT NULL,
    completed boolean DEFAULT false,
    reviewed_by uuid,
    review_type public.daily_review_type DEFAULT 'Primary'::public.daily_review_type,
    daily_note text,
    completed_at timestamp with time zone,
    escalation_sent boolean DEFAULT false,
    deputy_assigned_at timestamp with time zone,
    director_alerted_at timestamp with time zone,
    is_deputy_review boolean DEFAULT false,
    enhanced_oversight_required boolean DEFAULT false,
    director_notified_at timestamp with time zone
);


ALTER TABLE public.daily_governance_log OWNER TO postgres;

--
-- Name: detected_patterns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detected_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    severity character varying(10) NOT NULL,
    description text NOT NULL,
    affected_entities jsonb DEFAULT '[]'::jsonb NOT NULL,
    detected_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT detected_patterns_severity_check CHECK (((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[])))
);


ALTER TABLE public.detected_patterns OWNER TO postgres;

--
-- Name: director_interventions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.director_interventions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    director_user_id uuid NOT NULL,
    service_id uuid NOT NULL,
    intervention_type character varying(50) NOT NULL,
    target_user_id uuid,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    actioned_at timestamp with time zone,
    actioned_response text
);


ALTER TABLE public.director_interventions OWNER TO postgres;

--
-- Name: escalation_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.escalation_actions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    escalation_id uuid NOT NULL,
    company_id uuid NOT NULL,
    action_type character varying(100) NOT NULL,
    description text NOT NULL,
    taken_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.escalation_actions OWNER TO postgres;

--
-- Name: escalation_decisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.escalation_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    escalation_id uuid NOT NULL,
    decision_summary text NOT NULL,
    actions_taken text NOT NULL,
    response_time_days integer,
    decided_by uuid NOT NULL,
    status character varying(10) DEFAULT 'DRAFT'::character varying NOT NULL,
    locked_at timestamp without time zone,
    locked_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT escalation_decisions_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'LOCKED'::character varying])::text[])))
);


ALTER TABLE public.escalation_decisions OWNER TO postgres;

--
-- Name: escalations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.escalations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    risk_id uuid,
    incident_id uuid,
    escalated_by uuid NOT NULL,
    escalated_to uuid NOT NULL,
    reason text NOT NULL,
    status character varying(50) DEFAULT 'Pending'::character varying NOT NULL,
    priority character varying(50) DEFAULT 'High'::character varying,
    acknowledged_at timestamp with time zone,
    resolved_at timestamp with time zone,
    resolution_notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    severity_at_escalation character varying(10),
    escalation_type character varying(15) DEFAULT 'governance'::character varying NOT NULL,
    service_unit_id uuid,
    tags text[] DEFAULT '{}'::text[],
    house_id uuid,
    CONSTRAINT escalations_escalation_type_check CHECK (((escalation_type)::text = ANY ((ARRAY['operational'::character varying, 'governance'::character varying])::text[]))),
    CONSTRAINT escalations_priority_check CHECK (((priority)::text = ANY ((ARRAY['Medium'::character varying, 'High'::character varying, 'Urgent'::character varying, 'Critical'::character varying])::text[]))),
    CONSTRAINT escalations_status_check CHECK (((status)::text = ANY ((ARRAY['Pending'::character varying, 'Acknowledged'::character varying, 'In Progress'::character varying, 'Resolved'::character varying, 'Closed'::character varying])::text[])))
);


ALTER TABLE public.escalations OWNER TO postgres;

--
-- Name: evidence_pack_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evidence_pack_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    house_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    date_from date NOT NULL,
    date_to date NOT NULL,
    generated_at timestamp with time zone,
    pdf_url character varying(500),
    status character varying(20) DEFAULT 'pending'::character varying
);


ALTER TABLE public.evidence_pack_requests OWNER TO postgres;

--
-- Name: governance_answers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.governance_answers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    pulse_id uuid NOT NULL,
    question_id uuid NOT NULL,
    company_id uuid NOT NULL,
    answer text,
    answer_value jsonb,
    flagged boolean DEFAULT false,
    comment text,
    answered_by uuid NOT NULL,
    answered_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.governance_answers OWNER TO postgres;

--
-- Name: governance_health_checks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.governance_health_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    pulse_completion_pct numeric(5,2),
    weekly_review_completion_pct numeric(5,2),
    escalation_review_timeliness_pct numeric(5,2),
    avg_escalation_response_days numeric(5,2),
    longest_open_risk_days integer,
    recurring_risk_categories text[],
    governance_health_score numeric(5,2),
    narrative text,
    status character varying(10) DEFAULT 'DRAFT'::character varying NOT NULL,
    locked_at timestamp without time zone,
    locked_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT governance_health_checks_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'LOCKED'::character varying])::text[])))
);


ALTER TABLE public.governance_health_checks OWNER TO postgres;

--
-- Name: governance_pulses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.governance_pulses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    house_id uuid NOT NULL,
    completed_at timestamp with time zone,
    completed_by uuid,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    week_start date,
    pulse_date date,
    signals jsonb DEFAULT '{}'::jsonb,
    signal_flags text[] DEFAULT '{}'::text[],
    created_by uuid,
    locked_at timestamp without time zone,
    locked_by uuid,
    flags jsonb DEFAULT '[]'::jsonb,
    assigned_user_id uuid,
    entry_date date DEFAULT CURRENT_DATE NOT NULL,
    entry_time time without time zone DEFAULT CURRENT_TIME NOT NULL,
    related_person character varying(200),
    signal_type public.signal_type DEFAULT 'Observation'::public.signal_type NOT NULL,
    risk_domain text[] DEFAULT '{}'::text[] NOT NULL,
    immediate_action text NOT NULL,
    severity public.severity_level DEFAULT 'Low'::public.severity_level NOT NULL,
    has_happened_before public.happened_before DEFAULT 'No'::public.happened_before NOT NULL,
    pattern_concern public.pattern_concern DEFAULT 'None'::public.pattern_concern NOT NULL,
    escalation_required public.escalation_level DEFAULT 'None'::public.escalation_level NOT NULL,
    evidence_url text,
    review_status public.review_status DEFAULT 'New'::public.review_status,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    medication_error_type public.medication_error_type
);


ALTER TABLE public.governance_pulses OWNER TO postgres;

--
-- Name: governance_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.governance_questions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    template_id uuid NOT NULL,
    company_id uuid,
    question text NOT NULL,
    question_type character varying(50) DEFAULT 'yes_no'::character varying,
    options jsonb DEFAULT '[]'::jsonb,
    required boolean DEFAULT true,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT governance_questions_question_type_check CHECK (((question_type)::text = ANY ((ARRAY['yes_no'::character varying, 'scale'::character varying, 'text'::character varying, 'multiple_choice'::character varying, 'multi_select'::character varying])::text[])))
);


ALTER TABLE public.governance_questions OWNER TO postgres;

--
-- Name: governance_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.governance_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    pulse_days_per_week integer DEFAULT 3 NOT NULL,
    pulse_day_pattern text[] DEFAULT '{Monday,Wednesday,Friday}'::text[] NOT NULL,
    weekly_review_day character varying(10) DEFAULT 'Friday'::character varying NOT NULL,
    monthly_report_day integer DEFAULT 1 NOT NULL,
    tl_pulse_entry_enabled boolean DEFAULT false NOT NULL,
    tl_risk_view_enabled boolean DEFAULT false NOT NULL,
    tl_escalation_view_enabled boolean DEFAULT false NOT NULL,
    rm_reconstruction_view_enabled boolean DEFAULT false NOT NULL,
    rm_escalation_export_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.governance_schedules OWNER TO postgres;

--
-- Name: governance_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.governance_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid,
    name character varying(255) NOT NULL,
    description text,
    frequency character varying(50) DEFAULT 'monthly'::character varying,
    is_active boolean DEFAULT true,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category character varying(30),
    CONSTRAINT governance_templates_frequency_check CHECK (((frequency)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying, 'quarterly'::character varying, 'annually'::character varying])::text[])))
);


ALTER TABLE public.governance_templates OWNER TO postgres;

--
-- Name: house_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.house_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    house_id uuid NOT NULL,
    governance_frequency character varying(50) DEFAULT 'monthly'::character varying,
    risk_review_days integer DEFAULT 7,
    escalation_timeout_hours integer DEFAULT 24,
    notification_email character varying(255),
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    health_rating character varying(20) DEFAULT 'Healthy'::character varying
);


ALTER TABLE public.house_settings OWNER TO postgres;

--
-- Name: houses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.houses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    address text,
    postcode character varying(20),
    city character varying(100),
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    capacity integer DEFAULT 0,
    manager_id uuid,
    registration_number character varying(100),
    ofsted_rating character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    primary_rm_id uuid,
    deputy_rm_id uuid,
    last_daily_review_at timestamp with time zone,
    director_alert_flags jsonb DEFAULT '{}'::jsonb,
    deputy_cover_started_at timestamp with time zone,
    deputy_cover_ended_at timestamp with time zone,
    deputy_cover_total_seconds bigint DEFAULT 0,
    CONSTRAINT houses_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'closed'::character varying])::text[])))
);


ALTER TABLE public.houses OWNER TO postgres;

--
-- Name: incident_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incident_attachments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    incident_id uuid NOT NULL,
    company_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_url text NOT NULL,
    file_size integer,
    mime_type character varying(100),
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.incident_attachments OWNER TO postgres;

--
-- Name: incident_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incident_categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid,
    name character varying(150) NOT NULL,
    description text,
    reportable boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.incident_categories OWNER TO postgres;

--
-- Name: incident_escalations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incident_escalations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    incident_id uuid NOT NULL,
    escalation_id uuid NOT NULL,
    linked_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.incident_escalations OWNER TO postgres;

--
-- Name: incident_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incident_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    incident_id uuid NOT NULL,
    company_id uuid NOT NULL,
    event_type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT incident_events_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['created'::character varying, 'updated'::character varying, 'assigned'::character varying, 'resolved'::character varying, 'closed'::character varying, 'attachment_added'::character varying, 'comment_added'::character varying, 'escalated'::character varying])::text[])))
);


ALTER TABLE public.incident_events OWNER TO postgres;

--
-- Name: incident_reconstruction; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incident_reconstruction (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    house_id uuid NOT NULL,
    incident_id uuid NOT NULL,
    status character varying(50) DEFAULT 'Draft'::character varying NOT NULL,
    reconstruction_date date DEFAULT CURRENT_DATE NOT NULL,
    lead_investigator uuid NOT NULL,
    s1_metadata jsonb DEFAULT '{}'::jsonb,
    s2_incident_summary text,
    s3_chronology jsonb DEFAULT '[]'::jsonb,
    s4_signal_chain jsonb DEFAULT '[]'::jsonb,
    s5_trajectory_at_time public.trajectory_type,
    s6_contributing_factors text,
    s7_control_weaknesses text,
    s8_staffing_context text,
    s9_governance_oversight text,
    s10_resident_impact text,
    s11_family_external_comms text,
    s12_immediate_actions_taken text,
    s13_systemic_lessons text,
    s14_investigator_observations text,
    s15_narrative_summary text,
    s16_recommendations text,
    s17_director_signoff boolean DEFAULT false,
    completed_at timestamp with time zone,
    completed_by uuid,
    approved_at timestamp with time zone,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT incident_reconstruction_status_check CHECK (((status)::text = ANY ((ARRAY['Draft'::character varying, 'Under Review'::character varying, 'Completed'::character varying, 'Approved'::character varying])::text[])))
);


ALTER TABLE public.incident_reconstruction OWNER TO postgres;

--
-- Name: incident_reconstruction_pulses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incident_reconstruction_pulses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    reconstruction_id uuid NOT NULL,
    pulse_id uuid NOT NULL,
    linked_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.incident_reconstruction_pulses OWNER TO postgres;

--
-- Name: incident_reconstructions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incident_reconstructions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    service_unit_id uuid NOT NULL,
    incident_id uuid NOT NULL,
    incident_date date NOT NULL,
    incident_type text NOT NULL,
    reconstruction_method text DEFAULT 'CareSignal Governance Timeline Reconstruction'::text NOT NULL,
    timeline_events jsonb DEFAULT '[]'::jsonb NOT NULL,
    governance_awareness jsonb DEFAULT '{}'::jsonb NOT NULL,
    post_incident_actions jsonb DEFAULT '[]'::jsonb,
    contributing_factors text,
    governance_learning text,
    governance_conclusion text,
    director_statement text,
    generated_by uuid NOT NULL,
    status character varying(10) DEFAULT 'DRAFT'::character varying NOT NULL,
    locked_at timestamp without time zone,
    locked_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT incident_reconstructions_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'LOCKED'::character varying])::text[])))
);


ALTER TABLE public.incident_reconstructions OWNER TO postgres;

--
-- Name: incident_risks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incident_risks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    incident_id uuid NOT NULL,
    risk_id uuid NOT NULL,
    linked_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.incident_risks OWNER TO postgres;

--
-- Name: incidents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incidents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    house_id uuid NOT NULL,
    category_id uuid,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    severity character varying(50) DEFAULT 'moderate'::character varying NOT NULL,
    status character varying(50) DEFAULT 'open'::character varying NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    reported_at timestamp with time zone DEFAULT now() NOT NULL,
    location character varying(255),
    persons_involved jsonb DEFAULT '[]'::jsonb,
    witnesses jsonb DEFAULT '[]'::jsonb,
    immediate_action text,
    follow_up_required boolean DEFAULT false,
    reportable_to_authority boolean DEFAULT false,
    authority_notified_at timestamp with time zone,
    created_by uuid NOT NULL,
    assigned_to uuid,
    resolved_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    linked_risk_id uuid,
    category character varying(20),
    is_active boolean DEFAULT true,
    CONSTRAINT incidents_category_check CHECK (((category)::text = ANY ((ARRAY['behaviour'::character varying, 'medication'::character varying, 'staffing'::character varying, 'safeguarding'::character varying, 'environmental'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT incidents_severity_check CHECK (((severity)::text = ANY ((ARRAY['Low'::character varying, 'Moderate'::character varying, 'High'::character varying, 'Critical'::character varying])::text[]))),
    CONSTRAINT incidents_status_check CHECK (((status)::text = ANY ((ARRAY['Open'::character varying, 'In Progress'::character varying, 'Resolved'::character varying, 'Closed'::character varying])::text[])))
);


ALTER TABLE public.incidents OWNER TO postgres;

--
-- Name: job_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    job_id uuid NOT NULL,
    level character varying(20) DEFAULT 'info'::character varying,
    message text NOT NULL,
    data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.job_logs OWNER TO postgres;

--
-- Name: jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid,
    queue_name character varying(100) NOT NULL,
    job_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    payload jsonb DEFAULT '{}'::jsonb,
    result jsonb,
    error_message text,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    scheduled_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT jobs_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'completed'::character varying, 'failed'::character varying, 'retrying'::character varying])::text[])))
);


ALTER TABLE public.jobs OWNER TO postgres;

--
-- Name: monthly_board_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.monthly_board_reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    report_period_start date NOT NULL,
    report_period_end date NOT NULL,
    generated_by uuid NOT NULL,
    generated_at timestamp with time zone DEFAULT now(),
    draft_narrative text NOT NULL,
    final_narrative text,
    status character varying(20) DEFAULT 'draft'::character varying,
    pdf_url character varying(500),
    company_id uuid NOT NULL
);


ALTER TABLE public.monthly_board_reports OWNER TO postgres;

--
-- Name: monthly_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.monthly_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    report_month date NOT NULL,
    executive_summary text,
    stability_snapshot jsonb DEFAULT '[]'::jsonb,
    risk_heatmap jsonb DEFAULT '{}'::jsonb,
    escalation_summary jsonb DEFAULT '[]'::jsonb,
    trend_indicators jsonb DEFAULT '[]'::jsonb,
    governance_performance jsonb DEFAULT '{}'::jsonb,
    learning_actions text,
    board_assurance_statement text,
    signed_by uuid,
    co_signed_by uuid,
    status character varying(10) DEFAULT 'DRAFT'::character varying NOT NULL,
    locked_at timestamp without time zone,
    locked_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT monthly_reports_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'LOCKED'::character varying])::text[])))
);


ALTER TABLE public.monthly_reports OWNER TO postgres;

--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    email_enabled boolean DEFAULT true,
    in_app_enabled boolean DEFAULT true,
    sms_enabled boolean DEFAULT false,
    risk_alerts boolean DEFAULT true,
    incident_alerts boolean DEFAULT true,
    governance_reminders boolean DEFAULT true,
    escalation_alerts boolean DEFAULT true,
    report_completed boolean DEFAULT true,
    quiet_hours_start character varying(5) DEFAULT '22:00'::character varying,
    quiet_hours_end character varying(5) DEFAULT '07:00'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notification_preferences OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    type character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    read boolean DEFAULT false,
    read_at timestamp with time zone,
    data jsonb DEFAULT '{}'::jsonb,
    link character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_read boolean DEFAULT false NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(150) NOT NULL,
    resource character varying(100) NOT NULL,
    action character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: pulse_risk_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pulse_risk_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pulse_id uuid NOT NULL,
    risk_id uuid NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.pulse_risk_links OWNER TO postgres;

--
-- Name: report_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_cache (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    cache_key character varying(255) NOT NULL,
    data jsonb NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.report_cache OWNER TO postgres;

--
-- Name: report_exports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_exports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    report_id uuid NOT NULL,
    company_id uuid NOT NULL,
    format character varying(20) DEFAULT 'pdf'::character varying,
    file_url text NOT NULL,
    downloaded_by uuid,
    downloaded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT report_exports_format_check CHECK (((format)::text = ANY ((ARRAY['pdf'::character varying, 'csv'::character varying, 'xlsx'::character varying, 'json'::character varying])::text[])))
);


ALTER TABLE public.report_exports OWNER TO postgres;

--
-- Name: report_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    report_id uuid,
    requested_by uuid NOT NULL,
    report_type character varying(100) NOT NULL,
    parameters jsonb DEFAULT '{}'::jsonb,
    status character varying(50) DEFAULT 'queued'::character varying,
    job_id character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.report_requests OWNER TO postgres;

--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    type character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    generated_by uuid NOT NULL,
    file_url text,
    file_size integer,
    parameters jsonb DEFAULT '{}'::jsonb,
    error_message text,
    completed_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reports_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- Name: ri_acknowledgements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ri_acknowledgements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    incident_id uuid NOT NULL,
    ri_user_id uuid NOT NULL,
    acknowledged_at timestamp with time zone DEFAULT now(),
    acknowledgement_text text,
    is_statutory_notification boolean DEFAULT false,
    statutory_body_reference character varying(100),
    requires_follow_up boolean DEFAULT false
);


ALTER TABLE public.ri_acknowledgements OWNER TO postgres;

--
-- Name: ri_queries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ri_queries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    weekly_review_id uuid NOT NULL,
    ri_user_id uuid NOT NULL,
    rm_user_id uuid,
    query_text text NOT NULL,
    query_sent_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    rm_response_text text,
    is_escalated_to_director boolean DEFAULT false
);


ALTER TABLE public.ri_queries OWNER TO postgres;

--
-- Name: risk_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_actions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    risk_id uuid NOT NULL,
    company_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'Pending'::character varying,
    verified_by_rm uuid,
    verified_at_rm timestamp with time zone,
    verified_by_ri uuid,
    verified_at_ri timestamp with time zone,
    verification_notes text,
    assigned_to uuid,
    due_date timestamp with time zone,
    completed_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    linked_review_id uuid,
    effectiveness_reviewed_at timestamp with time zone,
    effectiveness_reviewed_by uuid,
    calculated_outcome public.action_effectiveness,
    rm_override_outcome public.action_effectiveness,
    director_override_outcome public.action_effectiveness,
    effectiveness_measured_at timestamp with time zone,
    CONSTRAINT risk_actions_status_check CHECK (((status)::text = ANY ((ARRAY['Pending'::character varying, 'In Progress'::character varying, 'Completed'::character varying, 'Cancelled'::character varying, 'Ongoing'::character varying])::text[])))
);


ALTER TABLE public.risk_actions OWNER TO postgres;

--
-- Name: risk_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_attachments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    risk_id uuid NOT NULL,
    company_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_url text NOT NULL,
    file_size integer,
    mime_type character varying(100),
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.risk_attachments OWNER TO postgres;

--
-- Name: risk_candidates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_candidates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    house_id uuid NOT NULL,
    cluster_id uuid,
    risk_domain character varying(50) NOT NULL,
    candidate_type character varying(50) NOT NULL,
    source_signals uuid[] DEFAULT '{}'::uuid[],
    status character varying(20) DEFAULT 'New'::character varying,
    dismissal_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    linked_risk_id uuid
);


ALTER TABLE public.risk_candidates OWNER TO postgres;

--
-- Name: risk_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid,
    name character varying(150) NOT NULL,
    description text,
    color character varying(20) DEFAULT '#ef4444'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.risk_categories OWNER TO postgres;

--
-- Name: risk_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    risk_id uuid NOT NULL,
    company_id uuid NOT NULL,
    event_type character varying(100) NOT NULL,
    description text,
    created_by uuid NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.risk_events OWNER TO postgres;

--
-- Name: risk_signal_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_signal_links (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    risk_id uuid,
    pulse_entry_id uuid NOT NULL,
    linked_by uuid NOT NULL,
    linked_at timestamp with time zone DEFAULT now(),
    link_note text,
    cluster_id uuid
);


ALTER TABLE public.risk_signal_links OWNER TO postgres;

--
-- Name: risks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    house_id uuid NOT NULL,
    category_id uuid,
    source_cluster_id uuid,
    title character varying(255) NOT NULL,
    description text,
    severity public.severity_level DEFAULT 'Moderate'::public.severity_level NOT NULL,
    trajectory public.trajectory_type DEFAULT 'Stable'::public.trajectory_type NOT NULL,
    status character varying(50) DEFAULT 'Open'::character varying NOT NULL,
    likelihood integer DEFAULT 3,
    impact integer DEFAULT 3,
    risk_score integer GENERATED ALWAYS AS ((COALESCE(likelihood, 1) * COALESCE(impact, 1))) STORED,
    assigned_to uuid,
    created_by uuid NOT NULL,
    control_effectiveness character varying(50) DEFAULT 'Partially'::character varying,
    next_review_date date,
    review_due_date timestamp with time zone,
    last_reviewed_at timestamp with time zone,
    resolved_at timestamp with time zone,
    closure_reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_linked_signal_date timestamp with time zone,
    recurrence_watch_until date,
    reopened_at timestamp with time zone,
    closed_at timestamp with time zone,
    risk_domain text,
    is_active boolean DEFAULT true,
    CONSTRAINT risks_impact_check CHECK (((impact >= 1) AND (impact <= 5))),
    CONSTRAINT risks_likelihood_check CHECK (((likelihood >= 1) AND (likelihood <= 5))),
    CONSTRAINT risks_status_check CHECK (((status)::text = ANY ((ARRAY['Open'::character varying, 'In Progress'::character varying, 'Resolved'::character varying, 'Escalated'::character varying, 'Closed'::character varying, 'Under Review'::character varying])::text[])))
);


ALTER TABLE public.risks OWNER TO postgres;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: weekly_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weekly_reviews (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    house_id uuid NOT NULL,
    week_ending date NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    step_reached integer DEFAULT 1,
    governance_narrative text,
    overall_position character varying(50)
);


ALTER TABLE public.weekly_reviews OWNER TO postgres;

--
-- Name: service_governance_compliance_mv; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.service_governance_compliance_mv AS
 WITH last_7_days AS (
         SELECT (generate_series(((CURRENT_DATE - 6))::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone, '1 day'::interval))::date AS review_date
        )
 SELECT h.id AS house_id,
    h.name AS house_name,
    h.company_id,
    l7.review_date,
        CASE
            WHEN ((dgl.id IS NOT NULL) AND (dgl.completed = true)) THEN 'completed'::text
            ELSE 'missed'::text
        END AS daily_status,
    COALESCE((wr.id IS NOT NULL), false) AS weekly_completed_this_week
   FROM (((public.houses h
     CROSS JOIN last_7_days l7)
     LEFT JOIN public.daily_governance_log dgl ON (((dgl.house_id = h.id) AND (dgl.review_date = l7.review_date))))
     LEFT JOIN public.weekly_reviews wr ON (((wr.house_id = h.id) AND (wr.week_ending >= l7.review_date) AND (wr.week_ending < (l7.review_date + 7)))))
  WHERE (h.is_active = true)
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.service_governance_compliance_mv OWNER TO postgres;

--
-- Name: service_unit_stability; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.service_unit_stability AS
 SELECT id AS house_id,
    100.00 AS stability_score,
    now() AS measured_at,
    '{}'::jsonb AS factors
   FROM public.houses h
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.service_unit_stability OWNER TO postgres;

--
-- Name: service_units; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.service_units AS
 SELECT id,
    company_id,
    name,
    address,
    postcode,
    city,
    status,
    capacity,
    manager_id,
    registration_number,
    ofsted_rating,
    created_at,
    updated_at,
    is_active
   FROM public.houses;


ALTER VIEW public.service_units OWNER TO postgres;

--
-- Name: signal_clusters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.signal_clusters (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    house_id uuid NOT NULL,
    risk_domain text NOT NULL,
    cluster_label character varying(300) NOT NULL,
    cluster_status public.cluster_status DEFAULT 'Emerging'::public.cluster_status NOT NULL,
    signal_count integer DEFAULT 0,
    first_signal_date date NOT NULL,
    last_signal_date date NOT NULL,
    trajectory public.trajectory_type DEFAULT 'Stable'::public.trajectory_type NOT NULL,
    linked_risk_id uuid,
    created_by_system boolean DEFAULT true,
    dismissed_by uuid,
    dismiss_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.signal_clusters OWNER TO postgres;

--
-- Name: system_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_type character varying(150) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.system_events OWNER TO postgres;

--
-- Name: system_prompts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_prompts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    title character varying(200),
    message text,
    prompt_type character varying(50),
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.system_prompts OWNER TO postgres;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid,
    key character varying(200) NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: threshold_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.threshold_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    house_id uuid NOT NULL,
    rule_number integer NOT NULL,
    rule_name text NOT NULL,
    cluster_id uuid,
    output_type public.threshold_output_type NOT NULL,
    fired_at timestamp with time zone DEFAULT now(),
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    dismissed boolean DEFAULT false,
    dismiss_reason text,
    company_id uuid,
    pulse_id uuid,
    description text,
    status character varying(50) DEFAULT 'Pending'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.threshold_events OWNER TO postgres;

--
-- Name: trend_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trend_metrics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    house_id uuid,
    metric_type character varying(100) NOT NULL,
    metric_value numeric(10,4) NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.trend_metrics OWNER TO postgres;

--
-- Name: user_houses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_houses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    house_id uuid NOT NULL,
    company_id uuid NOT NULL,
    role_in_house character varying(100),
    assigned_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_houses OWNER TO postgres;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    phone character varying(50),
    job_title character varying(150),
    avatar_url text,
    bio text,
    notification_preferences jsonb DEFAULT '{"sms": false, "email": true, "in_app": true}'::jsonb,
    timezone character varying(100) DEFAULT 'UTC'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- Name: user_service_units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_service_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    service_unit_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_service_units OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    role character varying(50) DEFAULT 'RESPONSIBLE_INDIVIDUAL'::character varying NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    last_login timestamp with time zone,
    password_reset_token character varying(255),
    password_reset_expires timestamp with time zone,
    email_verified boolean DEFAULT false,
    mfa_enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp without time zone,
    pulse_days jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['SUPER_ADMIN'::character varying, 'ADMIN'::character varying, 'REGISTERED_MANAGER'::character varying, 'RESPONSIBLE_INDIVIDUAL'::character varying, 'DIRECTOR'::character varying, 'TEAM_LEADER'::character varying, 'RM'::character varying, 'TL'::character varying, 'RI'::character varying, 'DIR'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'pending'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: websocket_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.websocket_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid,
    socket_id character varying(255) NOT NULL,
    connected_at timestamp with time zone DEFAULT now() NOT NULL,
    disconnected_at timestamp with time zone,
    is_active boolean DEFAULT true
);


ALTER TABLE public.websocket_sessions OWNER TO postgres;

--
-- Name: _migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._migrations ALTER COLUMN id SET DEFAULT nextval('public._migrations_id_seq'::regclass);


--
-- Data for Name: _migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._migrations (id, filename, executed_at) FROM stdin;
1	001_companies.sql	2026-03-15 08:24:02.764126+02
2	002_users.sql	2026-03-15 08:24:02.800539+02
3	003_roles_permissions.sql	2026-03-15 08:24:02.822609+02
4	004_houses.sql	2026-03-15 08:24:02.849015+02
5	005_risks.sql	2026-03-15 08:24:02.875167+02
6	006_incidents.sql	2026-03-15 08:24:02.91669+02
7	007_governance.sql	2026-03-15 08:24:02.943447+02
8	008_escalations.sql	2026-03-15 08:24:02.973893+02
9	009_notifications.sql	2026-03-15 08:24:02.992144+02
10	010_reports.sql	2026-03-15 08:24:03.013862+02
11	011_analytics.sql	2026-03-15 08:24:03.046782+02
12	012_system.sql	2026-03-15 08:24:03.065541+02
21	014_alignment_v3_part1.sql	2026-03-20 15:58:03.723018+02
22	006b_incident_events.sql	2026-03-23 11:55:39.256126+02
23	013_governance_rbac_additions.sql	2026-03-23 11:55:39.280566+02
24	015_alignment_v3_part2.sql	2026-03-23 12:00:33.526399+02
25	016_alignment_v3_part3.sql	2026-03-23 12:00:33.536357+02
26	017_alignment_v3_part4.sql	2026-03-23 12:02:23.016991+02
27	018_alignment_v3_part5.sql	2026-03-23 14:33:53.985771+02
28	019_alignment_v3_part6.sql	2026-03-23 14:33:53.996354+02
29	020_full_alignment_v3.sql	2026-03-23 14:33:54.052773+02
30	021_system_alignment_complement.sql	2026-03-23 14:33:54.093407+02
31	v3_defaults.sql	2026-03-23 14:54:35.080409+02
32	012_nullable_companyId_questions.sql	2026-03-24 14:00:08.540816+02
33	013_add_multi_select_type.sql	2026-03-24 14:01:38.601668+02
34	014_add_team_leader_role.sql	2026-03-24 21:36:48.595469+02
35	015_per_user_pulse_days.sql	2026-04-02 11:50:55.736731+02
36	016_ensure_system_pulse_template.sql	2026-04-02 11:50:58.172311+02
37	017_fix_governance_table_names.sql	2026-04-02 11:50:58.176515+02
38	018_rebrand_to_houses.sql	2026-04-02 11:50:58.208832+02
39	019_add_archived_company_status.sql	2026-04-02 11:50:58.251691+02
40	020_fix_pulse_statuses.sql	2026-04-20 19:05:01.201747+02
41	021_ordin_core_governance.sql	2026-04-20 19:05:01.250075+02
42	022_ordin_core_risks_upgrade.sql	2026-04-20 19:14:36.139309+02
43	023_governance_fallback.sql	2026-04-20 20:14:54.114144+02
44	024_medication_error_type.sql	2026-04-20 20:33:01.460739+02
45	025_risk_actions_effectiveness.sql	2026-04-20 21:09:26.663923+02
46	026_incident_reconstruction.sql	2026-04-20 21:09:26.677307+02
47	027_weekly_review_upgrade.sql	2026-04-20 21:27:33.365823+02
48	028_reconstruction_links.sql	2026-04-20 21:38:07.394096+02
49	029_ordin_core_alignment.sql	2026-04-26 11:26:01.65931+02
50	030_worker_compatibility.sql	2026-04-26 11:26:01.746243+02
51	024b_add_weekly_reviews.sql	2026-04-29 09:24:53.520428+02
52	031_add_created_by_to_pulses.sql	2026-04-29 09:24:53.640358+02
53	035_stabilize_schema.sql	2026-04-29 10:11:25.015996+02
54	036_ri_governance_alignment.sql	2026-04-29 10:11:25.059762+02
55	032_fix_risk_signal_links.sql	2026-04-30 12:16:09.932147+02
56	032b_fix_missing_columns.sql	2026-04-30 12:19:15.948378+02
57	032c_fix_missing_columns.sql	2026-04-30 12:56:08.079506+02
58	033_fix_escalations_house_id.sql	2026-04-30 12:56:08.212997+02
59	034_add_incident_links.sql	2026-04-30 12:56:37.606924+02
60	037_director_governance_alignment.sql	2026-04-30 12:59:17.009504+02
61	038_add_risk_candidates_table.sql	2026-05-02 06:30:01.408147+02
62	039_fix_incidents_severity_constraint.sql	2026-05-02 07:30:51.436976+02
\.


--
-- Data for Name: action_effectiveness; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.action_effectiveness (id, action_id, risk_id, company_id, house_id, risk_domain, outcome, calculated_at, data) FROM stdin;
\.


--
-- Data for Name: addendums; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.addendums (id, company_id, parent_type, parent_id, content, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: analytics_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.analytics_snapshots (id, company_id, snapshot_date, total_risks, open_risks, resolved_risks, critical_risks, total_incidents, open_incidents, governance_compliance_rate, total_escalations, resolved_escalations, house_count, user_count, data, created_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, company_id, user_id, action, resource, resource_id, old_values, new_values, ip_address, user_agent, created_at, entity_type, entity_id, metadata) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, name, domain, status, plan, logo_url, address, phone, email, settings, created_at, updated_at) FROM stdin;
11111111-1111-1111-1111-111111111111	OrdinCore Demo Company	ordincore.com	active	starter	\N	\N	\N	\N	{}	2026-04-30 13:04:53.329598+02	2026-04-30 13:04:53.329598+02
\.


--
-- Data for Name: control_failure_flags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.control_failure_flags (id, service_id, risk_id, failure_type, threshold_trigger, detected_at, resolved_at, resolved_by, resolution_note) FROM stdin;
\.


--
-- Data for Name: daily_governance_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_governance_log (id, house_id, review_date, completed, reviewed_by, review_type, daily_note, completed_at, escalation_sent, deputy_assigned_at, director_alerted_at, is_deputy_review, enhanced_oversight_required, director_notified_at) FROM stdin;
7b358043-e0da-4cc0-9d22-8a00d891c806	11111111-2222-3333-4444-555555555555	2026-05-01	f	\N	Primary	\N	\N	f	\N	\N	f	f	\N
36803f98-5b67-4d84-80ce-bad84df55ec1	22222222-2222-3333-4444-555555555555	2026-05-01	t	11111111-1111-1111-1111-111111111102	Primary	Final governance verification complete.	2026-05-01 04:47:13.43386+02	f	\N	\N	f	f	\N
23261b91-0dcc-4178-8a0a-b28ed2a54e2e	11111111-2222-3333-4444-555555555555	2026-05-02	t	11111111-1111-1111-1111-111111111102	Primary	Weekly review for Rose House completed. All high-priority signals triaged and risks promoted to the register for monitoring. Service position remains stable with focused improvements on medication and staffing clusters.	2026-05-02 02:55:11.034832+02	f	\N	\N	f	f	\N
\.


--
-- Data for Name: detected_patterns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detected_patterns (id, company_id, type, severity, description, affected_entities, detected_at, created_at) FROM stdin;
\.


--
-- Data for Name: director_interventions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.director_interventions (id, director_user_id, service_id, intervention_type, target_user_id, message, created_at, actioned_at, actioned_response) FROM stdin;
\.


--
-- Data for Name: escalation_actions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.escalation_actions (id, escalation_id, company_id, action_type, description, taken_by, created_at) FROM stdin;
\.


--
-- Data for Name: escalation_decisions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.escalation_decisions (id, escalation_id, decision_summary, actions_taken, response_time_days, decided_by, status, locked_at, locked_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: escalations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.escalations (id, company_id, risk_id, incident_id, escalated_by, escalated_to, reason, status, priority, acknowledged_at, resolved_at, resolution_notes, metadata, created_at, updated_at, severity_at_escalation, escalation_type, service_unit_id, tags, house_id) FROM stdin;
3c73ecf0-a499-4636-9510-e667af669912	11111111-1111-1111-1111-111111111111	\N	\N	11111111-1111-1111-1111-111111111102	11111111-1111-1111-1111-111111111103	Recurrent medication errors in Rose House	Pending	High	\N	\N	\N	{}	2026-05-02 07:31:02.824+02	2026-05-02 07:31:02.564227+02	\N	governance	\N	{}	11111111-2222-3333-4444-555555555555
3defc3fb-836b-41a8-b04d-e5b1b3eae4bf	11111111-1111-1111-1111-111111111111	\N	\N	11111111-1111-1111-1111-111111111102	11111111-1111-1111-1111-111111111103	Staffing levels below safe threshold	Pending	High	\N	\N	\N	{}	2026-04-27 07:31:02.833+02	2026-05-02 07:31:02.564227+02	\N	governance	\N	{}	11111111-2222-3333-4444-555555555555
8a557a2b-a6c2-474d-b913-bfc0490d0cec	11111111-1111-1111-1111-111111111111	\N	\N	11111111-1111-1111-1111-111111111102	11111111-1111-1111-1111-111111111103	Unresolved safeguarding concern	Pending	High	\N	\N	\N	{}	2026-04-22 07:31:02.839+02	2026-05-02 07:31:02.564227+02	\N	governance	\N	{}	11111111-2222-3333-4444-555555555555
\.


--
-- Data for Name: evidence_pack_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evidence_pack_requests (id, house_id, requested_by, date_from, date_to, generated_at, pdf_url, status) FROM stdin;
\.


--
-- Data for Name: governance_answers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.governance_answers (id, pulse_id, question_id, company_id, answer, answer_value, flagged, comment, answered_by, answered_at) FROM stdin;
\.


--
-- Data for Name: governance_health_checks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.governance_health_checks (id, company_id, period_start, period_end, pulse_completion_pct, weekly_review_completion_pct, escalation_review_timeliness_pct, avg_escalation_response_days, longest_open_risk_days, recurring_risk_categories, governance_health_score, narrative, status, locked_at, locked_by, created_at) FROM stdin;
\.


--
-- Data for Name: governance_pulses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.governance_pulses (id, company_id, house_id, completed_at, completed_by, description, created_at, updated_at, week_start, pulse_date, signals, signal_flags, created_by, locked_at, locked_by, flags, assigned_user_id, entry_date, entry_time, related_person, signal_type, risk_domain, immediate_action, severity, has_happened_before, pattern_concern, escalation_required, evidence_url, review_status, reviewed_by, reviewed_at, medication_error_type) FROM stdin;
cf02cee4-8726-465b-83f2-12c0930619e8	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 0 for Behaviour	2026-05-02 07:31:02.737+02	2026-05-02 07:31:02.737+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-05-02	10:00:00	\N	Concern	{Behaviour}	Logged in system	Low	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
fda6864e-e520-4f39-9589-0acc8720cf3f	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 1 for Medication	2026-05-01 07:31:02.739+02	2026-05-01 07:31:02.739+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-05-01	10:00:00	\N	Concern	{Medication}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
a6b84f3a-f1b5-456d-aac9-1fa38b137aaf	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 2 for Staffing	2026-04-30 07:31:02.74+02	2026-04-30 07:31:02.74+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-30	10:00:00	\N	Concern	{Staffing}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
803ee157-1f27-4874-8ce1-96076aa740ca	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 3 for Safeguarding	2026-04-29 07:31:02.741+02	2026-04-29 07:31:02.741+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-29	10:00:00	\N	Concern	{Safeguarding}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
fe5d9163-f949-46ed-94ca-08ec4ae80c20	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 4 for Environment	2026-04-28 07:31:02.741+02	2026-04-28 07:31:02.741+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-28	10:00:00	\N	Concern	{Environment}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
69ec29df-4526-46a8-aa80-be17ecfdea52	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 5 for Behaviour	2026-04-27 07:31:02.742+02	2026-04-27 07:31:02.742+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-27	10:00:00	\N	Concern	{Behaviour}	Logged in system	Moderate	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
5619ddd4-af1b-4336-a3bb-daf87a7edbcc	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 6 for Medication	2026-04-26 07:31:02.743+02	2026-04-26 07:31:02.743+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-26	10:00:00	\N	Concern	{Medication}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
62d9d1cf-9e05-4cf8-97cd-cfb6a8d72ac8	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 7 for Staffing	2026-04-25 07:31:02.743+02	2026-04-25 07:31:02.743+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-25	10:00:00	\N	Concern	{Staffing}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
56201640-fbc9-4bda-85ee-c82820f6a11c	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 8 for Safeguarding	2026-04-24 07:31:02.744+02	2026-04-24 07:31:02.744+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-24	10:00:00	\N	Concern	{Safeguarding}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
87adbe36-49b1-4109-9ec1-0b4ffe7fc93a	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 9 for Environment	2026-04-23 07:31:02.744+02	2026-04-23 07:31:02.744+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-23	10:00:00	\N	Concern	{Environment}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
e286625f-d827-47f9-9c16-87e5b87d942c	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 10 for Behaviour	2026-04-22 07:31:02.745+02	2026-04-22 07:31:02.745+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-22	10:00:00	\N	Concern	{Behaviour}	Logged in system	High	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
93ecdfa2-3d97-4643-b675-17ee94a762c0	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 11 for Medication	2026-04-21 07:31:02.745+02	2026-04-21 07:31:02.745+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-21	10:00:00	\N	Concern	{Medication}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
c8daea9d-c884-4f0f-9085-46bcbb92dd30	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 12 for Staffing	2026-04-20 07:31:02.745+02	2026-04-20 07:31:02.745+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-20	10:00:00	\N	Concern	{Staffing}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
7cfde860-e0f1-4d11-ae19-bd94bc349672	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 13 for Safeguarding	2026-04-19 07:31:02.746+02	2026-04-19 07:31:02.746+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-19	10:00:00	\N	Concern	{Safeguarding}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
59669d31-0ed6-4235-94db-86d19e43f9ab	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 14 for Environment	2026-04-18 07:31:02.746+02	2026-04-18 07:31:02.746+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-18	10:00:00	\N	Concern	{Environment}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
94844303-186d-413e-9c83-84c22d1bc08e	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 15 for Behaviour	2026-04-17 07:31:02.747+02	2026-04-17 07:31:02.747+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-17	10:00:00	\N	Concern	{Behaviour}	Logged in system	Critical	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
cefdb2d6-d4fb-4dd6-b242-cafb3d65ae33	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 16 for Medication	2026-04-16 07:31:02.747+02	2026-04-16 07:31:02.747+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-16	10:00:00	\N	Concern	{Medication}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
e1caca23-6422-4e5f-a7c2-a14d6ff298d0	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 17 for Staffing	2026-04-15 07:31:02.748+02	2026-04-15 07:31:02.748+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-15	10:00:00	\N	Concern	{Staffing}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
091b2e03-dbde-4f06-89c5-ffc61deac73e	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 18 for Safeguarding	2026-04-14 07:31:02.748+02	2026-04-14 07:31:02.748+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-14	10:00:00	\N	Concern	{Safeguarding}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
c863e31e-861f-4563-a577-6171ee016aee	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 19 for Environment	2026-04-13 07:31:02.749+02	2026-04-13 07:31:02.749+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-13	10:00:00	\N	Concern	{Environment}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
0a2c6b04-887f-4abd-8619-7fae6ed729ce	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 20 for Behaviour	2026-04-12 07:31:02.749+02	2026-04-12 07:31:02.749+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-12	10:00:00	\N	Concern	{Behaviour}	Logged in system	Low	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
7153f252-764d-41ff-90aa-7b11de8527bd	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 21 for Medication	2026-04-11 07:31:02.75+02	2026-04-11 07:31:02.75+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-11	10:00:00	\N	Concern	{Medication}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
07d93eb7-9350-4a0b-b700-ee48a2506757	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 22 for Staffing	2026-04-10 07:31:02.751+02	2026-04-10 07:31:02.751+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-10	10:00:00	\N	Concern	{Staffing}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
92a3ef59-ce1c-4ff0-bc3c-5392026558c1	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 23 for Safeguarding	2026-04-09 07:31:02.751+02	2026-04-09 07:31:02.751+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-09	10:00:00	\N	Concern	{Safeguarding}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
b816434b-f5af-4970-82d5-fa7e20d6dfa1	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 24 for Environment	2026-04-08 07:31:02.751+02	2026-04-08 07:31:02.751+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-08	10:00:00	\N	Concern	{Environment}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
85b24f7a-9ddc-4f54-8dba-c03b2ebd6aeb	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 25 for Behaviour	2026-04-07 07:31:02.752+02	2026-04-07 07:31:02.752+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-07	10:00:00	\N	Concern	{Behaviour}	Logged in system	Moderate	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
aec1bfd2-a6ee-4c08-807a-fc658f115902	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 26 for Medication	2026-04-06 07:31:02.752+02	2026-04-06 07:31:02.752+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-06	10:00:00	\N	Concern	{Medication}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
aa8ef920-8e3d-42c9-a4cb-0e3f8020f734	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 27 for Staffing	2026-04-05 07:31:02.753+02	2026-04-05 07:31:02.753+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-05	10:00:00	\N	Concern	{Staffing}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
6d09eef8-29c8-4a7f-b09f-630b8ac77e1e	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 28 for Safeguarding	2026-04-04 07:31:02.753+02	2026-04-04 07:31:02.753+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-04	10:00:00	\N	Concern	{Safeguarding}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
fdc8261e-4049-4af6-89e9-9a8d4ba6153e	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	\N	Historical signal 29 for Environment	2026-04-03 07:31:02.754+02	2026-04-03 07:31:02.754+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111101	\N	\N	[]	\N	2026-04-03	10:00:00	\N	Concern	{Environment}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
4a3c2bd4-25a9-4e00-8a07-a07bece57492	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 0 for Behaviour	2026-05-02 07:31:02.754+02	2026-05-02 07:31:02.754+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-05-02	10:00:00	\N	Concern	{Behaviour}	Logged in system	Low	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
16d22758-dc64-45aa-9e4e-c9f9d944cae6	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 1 for Medication	2026-05-01 07:31:02.755+02	2026-05-01 07:31:02.755+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-05-01	10:00:00	\N	Concern	{Medication}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
f05d21a9-2b5f-475d-8e3c-114d2bf0f9d7	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 2 for Staffing	2026-04-30 07:31:02.755+02	2026-04-30 07:31:02.755+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-30	10:00:00	\N	Concern	{Staffing}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
3d6f4cdd-73af-4e39-ba40-e3ba1611e7c2	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 3 for Safeguarding	2026-04-29 07:31:02.756+02	2026-04-29 07:31:02.756+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-29	10:00:00	\N	Concern	{Safeguarding}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
293ffb03-5b10-4e6a-ac94-87e5866df30e	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 4 for Environment	2026-04-28 07:31:02.756+02	2026-04-28 07:31:02.756+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-28	10:00:00	\N	Concern	{Environment}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
e7bfe2a8-8d64-437b-86c7-907d3364395a	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 5 for Behaviour	2026-04-27 07:31:02.757+02	2026-04-27 07:31:02.757+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-27	10:00:00	\N	Concern	{Behaviour}	Logged in system	Moderate	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
31b88ee9-68f3-4dbb-ac64-a4f1809951c2	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 6 for Medication	2026-04-26 07:31:02.757+02	2026-04-26 07:31:02.757+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-26	10:00:00	\N	Concern	{Medication}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
352dee17-8853-42ee-ad5e-0581e7fa8e47	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 7 for Staffing	2026-04-25 07:31:02.758+02	2026-04-25 07:31:02.758+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-25	10:00:00	\N	Concern	{Staffing}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
73e3a5e3-12e6-47f8-a564-37f5cdfa03e3	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 8 for Safeguarding	2026-04-24 07:31:02.758+02	2026-04-24 07:31:02.758+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-24	10:00:00	\N	Concern	{Safeguarding}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
e05c7f6a-d5a2-4c46-a18f-d8bb66fc41eb	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 9 for Environment	2026-04-23 07:31:02.758+02	2026-04-23 07:31:02.758+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-23	10:00:00	\N	Concern	{Environment}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
564da5dd-4b6f-4791-8e11-b1e5195fe80a	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 10 for Behaviour	2026-04-22 07:31:02.759+02	2026-04-22 07:31:02.759+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-22	10:00:00	\N	Concern	{Behaviour}	Logged in system	High	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
2ed77e54-df0c-4edb-aa06-4030ec66c77c	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 11 for Medication	2026-04-21 07:31:02.759+02	2026-04-21 07:31:02.759+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-21	10:00:00	\N	Concern	{Medication}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
7161590a-51ca-4fc7-be9f-000366b6638b	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 12 for Staffing	2026-04-20 07:31:02.76+02	2026-04-20 07:31:02.76+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-20	10:00:00	\N	Concern	{Staffing}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
6a0233a3-df73-4433-a452-7a416bd08492	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 13 for Safeguarding	2026-04-19 07:31:02.76+02	2026-04-19 07:31:02.76+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-19	10:00:00	\N	Concern	{Safeguarding}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
60cc54a6-3984-405b-ad1b-3aad42aead21	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 14 for Environment	2026-04-18 07:31:02.761+02	2026-04-18 07:31:02.761+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-18	10:00:00	\N	Concern	{Environment}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
3bd7490b-1908-43b2-b4d2-1bc4043ed042	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 15 for Behaviour	2026-04-17 07:31:02.761+02	2026-04-17 07:31:02.761+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-17	10:00:00	\N	Concern	{Behaviour}	Logged in system	Critical	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
65507c38-27f3-4628-8d1b-8132682b3389	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 16 for Medication	2026-04-16 07:31:02.762+02	2026-04-16 07:31:02.762+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-16	10:00:00	\N	Concern	{Medication}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
feed7332-bd88-49c6-a900-accae4705d93	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 17 for Staffing	2026-04-15 07:31:02.762+02	2026-04-15 07:31:02.762+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-15	10:00:00	\N	Concern	{Staffing}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
2c700d3f-c05c-46df-a0db-04d6a7ac13bb	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 18 for Safeguarding	2026-04-14 07:31:02.763+02	2026-04-14 07:31:02.763+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-14	10:00:00	\N	Concern	{Safeguarding}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
672d1efc-1d51-498b-9ff3-a245cfc5c615	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 19 for Environment	2026-04-13 07:31:02.763+02	2026-04-13 07:31:02.763+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-13	10:00:00	\N	Concern	{Environment}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
203adfab-995b-4aa7-a04e-11b6d0d64845	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 20 for Behaviour	2026-04-12 07:31:02.763+02	2026-04-12 07:31:02.763+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-12	10:00:00	\N	Concern	{Behaviour}	Logged in system	Low	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
f42aae54-5775-4668-a62c-ae159ae28805	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 21 for Medication	2026-04-11 07:31:02.764+02	2026-04-11 07:31:02.764+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-11	10:00:00	\N	Concern	{Medication}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
acf00c8c-c08c-448b-b6cf-327c085a90d1	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 22 for Staffing	2026-04-10 07:31:02.764+02	2026-04-10 07:31:02.764+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-10	10:00:00	\N	Concern	{Staffing}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
25370f81-8bf5-45a0-bf66-10d7d179a808	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 23 for Safeguarding	2026-04-09 07:31:02.765+02	2026-04-09 07:31:02.765+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-09	10:00:00	\N	Concern	{Safeguarding}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
8e243c14-9553-4419-abe8-f355d5fd0aa7	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 24 for Environment	2026-04-08 07:31:02.765+02	2026-04-08 07:31:02.765+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-08	10:00:00	\N	Concern	{Environment}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
7f60d5e6-8218-44b2-8b84-33c29f2d5f2b	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 25 for Behaviour	2026-04-07 07:31:02.766+02	2026-04-07 07:31:02.766+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-07	10:00:00	\N	Concern	{Behaviour}	Logged in system	Moderate	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
ba7962f1-b808-4ade-ad46-9f2e03e6f84d	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 26 for Medication	2026-04-06 07:31:02.766+02	2026-04-06 07:31:02.766+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-06	10:00:00	\N	Concern	{Medication}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
11838c4a-04ee-403c-8eb2-df20540348f0	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 27 for Staffing	2026-04-05 07:31:02.767+02	2026-04-05 07:31:02.767+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-05	10:00:00	\N	Concern	{Staffing}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
439543ae-2452-4684-9039-f1c81c5bc421	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 28 for Safeguarding	2026-04-04 07:31:02.767+02	2026-04-04 07:31:02.767+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-04	10:00:00	\N	Concern	{Safeguarding}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
b5fcda3e-2b13-47e1-a5aa-22c2226aa10b	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	\N	Historical signal 29 for Environment	2026-04-03 07:31:02.768+02	2026-04-03 07:31:02.768+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111102	\N	\N	[]	\N	2026-04-03	10:00:00	\N	Concern	{Environment}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
a8386c3f-2314-4243-aa7d-58e9f8e6b3bc	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 0 for Behaviour	2026-05-02 07:31:02.768+02	2026-05-02 07:31:02.768+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-05-02	10:00:00	\N	Concern	{Behaviour}	Logged in system	Low	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
58957ea3-e51b-43d8-873d-2b825db8ee27	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 1 for Medication	2026-05-01 07:31:02.769+02	2026-05-01 07:31:02.769+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-05-01	10:00:00	\N	Concern	{Medication}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
0addd425-4f1f-436d-800d-486e4afab419	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 2 for Staffing	2026-04-30 07:31:02.769+02	2026-04-30 07:31:02.769+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-30	10:00:00	\N	Concern	{Staffing}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
87831e95-fda4-4788-9af7-21355410e333	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 3 for Safeguarding	2026-04-29 07:31:02.769+02	2026-04-29 07:31:02.769+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-29	10:00:00	\N	Concern	{Safeguarding}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
cf685e95-bf0f-46ea-bdc0-9496ab3b28e9	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 4 for Environment	2026-04-28 07:31:02.77+02	2026-04-28 07:31:02.77+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-28	10:00:00	\N	Concern	{Environment}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
da094d25-6d91-4dd7-a530-7651f29d0321	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 5 for Behaviour	2026-04-27 07:31:02.77+02	2026-04-27 07:31:02.77+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-27	10:00:00	\N	Concern	{Behaviour}	Logged in system	Moderate	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
ebb2b379-9a99-4033-bfbe-e3419235587a	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 6 for Medication	2026-04-26 07:31:02.77+02	2026-04-26 07:31:02.77+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-26	10:00:00	\N	Concern	{Medication}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
7f74be49-f34d-4915-93bf-c482dc4afeea	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 7 for Staffing	2026-04-25 07:31:02.771+02	2026-04-25 07:31:02.771+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-25	10:00:00	\N	Concern	{Staffing}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
fc9ff2ea-9533-4273-a169-c6cff98d0320	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 8 for Safeguarding	2026-04-24 07:31:02.771+02	2026-04-24 07:31:02.771+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-24	10:00:00	\N	Concern	{Safeguarding}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
3a5444e4-07e2-451e-9b3e-5b44858c7b8c	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 9 for Environment	2026-04-23 07:31:02.771+02	2026-04-23 07:31:02.771+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-23	10:00:00	\N	Concern	{Environment}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
92e5faef-410b-4862-9ddf-bccfc5346165	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 10 for Behaviour	2026-04-22 07:31:02.771+02	2026-04-22 07:31:02.771+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-22	10:00:00	\N	Concern	{Behaviour}	Logged in system	High	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
f9c59b19-8777-4666-ab80-cc4c8ba47c90	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 11 for Medication	2026-04-21 07:31:02.772+02	2026-04-21 07:31:02.772+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-21	10:00:00	\N	Concern	{Medication}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
f79540ca-ef4e-4ac9-86fe-cb67076e117e	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 12 for Staffing	2026-04-20 07:31:02.772+02	2026-04-20 07:31:02.772+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-20	10:00:00	\N	Concern	{Staffing}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
d5d5d899-b883-4eae-bd0d-93fb495579b2	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 13 for Safeguarding	2026-04-19 07:31:02.773+02	2026-04-19 07:31:02.773+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-19	10:00:00	\N	Concern	{Safeguarding}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
ddb1836d-ef26-4ff7-a260-283f32f99880	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 14 for Environment	2026-04-18 07:31:02.773+02	2026-04-18 07:31:02.773+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-18	10:00:00	\N	Concern	{Environment}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
1f95f974-e92a-4f1c-9d59-60e19372f3cf	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 15 for Behaviour	2026-04-17 07:31:02.774+02	2026-04-17 07:31:02.774+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-17	10:00:00	\N	Concern	{Behaviour}	Logged in system	Critical	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
7e5b83d9-10dc-425a-81c9-daabc101a0ec	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 16 for Medication	2026-04-16 07:31:02.774+02	2026-04-16 07:31:02.774+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-16	10:00:00	\N	Concern	{Medication}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
5c089709-68fe-4840-835d-2604b03b5d79	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 17 for Staffing	2026-04-15 07:31:02.775+02	2026-04-15 07:31:02.775+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-15	10:00:00	\N	Concern	{Staffing}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
3f133353-7f4f-4215-a59d-5332672c76fb	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 18 for Safeguarding	2026-04-14 07:31:02.775+02	2026-04-14 07:31:02.775+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-14	10:00:00	\N	Concern	{Safeguarding}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
13a2a3af-d543-4217-95d9-d68d0a166099	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 19 for Environment	2026-04-13 07:31:02.776+02	2026-04-13 07:31:02.776+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-13	10:00:00	\N	Concern	{Environment}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
d4ade907-4ee3-4523-a219-4be880bcdb96	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 20 for Behaviour	2026-04-12 07:31:02.776+02	2026-04-12 07:31:02.776+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-12	10:00:00	\N	Concern	{Behaviour}	Logged in system	Low	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
3961c802-5ee9-41f7-8470-6229fc8a95ab	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 21 for Medication	2026-04-11 07:31:02.777+02	2026-04-11 07:31:02.777+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-11	10:00:00	\N	Concern	{Medication}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
ff4ccafc-8db5-4f91-aa07-5b197caee9ec	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 22 for Staffing	2026-04-10 07:31:02.777+02	2026-04-10 07:31:02.777+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-10	10:00:00	\N	Concern	{Staffing}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
007bd5dc-a6ef-4e69-8e39-63f8a9b668a4	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 23 for Safeguarding	2026-04-09 07:31:02.778+02	2026-04-09 07:31:02.778+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-09	10:00:00	\N	Concern	{Safeguarding}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
b684086f-de87-4d7b-ada9-67bec19bef6b	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 24 for Environment	2026-04-08 07:31:02.778+02	2026-04-08 07:31:02.778+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-08	10:00:00	\N	Concern	{Environment}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
d4943235-e188-4af7-9fb0-0d0164cfce74	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 25 for Behaviour	2026-04-07 07:31:02.779+02	2026-04-07 07:31:02.779+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-07	10:00:00	\N	Concern	{Behaviour}	Logged in system	Moderate	Yes	Escalating	None	\N	Reviewed	\N	\N	\N
5ff8a2fe-4002-4015-99db-a016c4bd4ae8	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 26 for Medication	2026-04-06 07:31:02.779+02	2026-04-06 07:31:02.779+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-06	10:00:00	\N	Concern	{Medication}	Logged in system	High	Yes	Clear	None	\N	Reviewed	\N	\N	\N
6404ccb4-0047-495d-bebb-b5ee5c6f637c	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 27 for Staffing	2026-04-05 07:31:02.78+02	2026-04-05 07:31:02.78+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-05	10:00:00	\N	Concern	{Staffing}	Logged in system	Critical	Yes	Clear	None	\N	Reviewed	\N	\N	\N
2f4abbbb-164a-4317-b5a2-e27582f24ea0	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 28 for Safeguarding	2026-04-04 07:31:02.781+02	2026-04-04 07:31:02.781+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-04	10:00:00	\N	Concern	{Safeguarding}	Logged in system	Low	Yes	Clear	None	\N	Reviewed	\N	\N	\N
041235ec-f56e-40a2-b0de-6a2d6898e5cf	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	\N	Historical signal 29 for Environment	2026-04-03 07:31:02.781+02	2026-04-03 07:31:02.781+02	\N	\N	{}	{}	11111111-1111-1111-1111-111111111106	\N	\N	[]	\N	2026-04-03	10:00:00	\N	Concern	{Environment}	Logged in system	Moderate	Yes	Clear	None	\N	Reviewed	\N	\N	\N
\.


--
-- Data for Name: governance_questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.governance_questions (id, template_id, company_id, question, question_type, options, required, order_index, created_at) FROM stdin;
\.


--
-- Data for Name: governance_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.governance_schedules (id, company_id, pulse_days_per_week, pulse_day_pattern, weekly_review_day, monthly_report_day, tl_pulse_entry_enabled, tl_risk_view_enabled, tl_escalation_view_enabled, rm_reconstruction_view_enabled, rm_escalation_export_enabled, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: governance_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.governance_templates (id, company_id, name, description, frequency, is_active, created_by, created_at, updated_at, category) FROM stdin;
\.


--
-- Data for Name: house_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.house_settings (id, house_id, governance_frequency, risk_review_days, escalation_timeout_hours, notification_email, settings, created_at, updated_at, health_rating) FROM stdin;
\.


--
-- Data for Name: houses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.houses (id, company_id, name, address, postcode, city, status, capacity, manager_id, registration_number, ofsted_rating, created_at, updated_at, is_active, primary_rm_id, deputy_rm_id, last_daily_review_at, director_alert_flags, deputy_cover_started_at, deputy_cover_ended_at, deputy_cover_total_seconds) FROM stdin;
33333333-3333-3333-4444-555555555555	11111111-1111-1111-1111-111111111111	Maple Court	\N	\N	\N	active	0	\N	\N	\N	2026-05-01 11:37:47.508269+02	2026-05-01 11:37:47.508269+02	t	11111111-1111-1111-1111-111111111107	\N	\N	{}	\N	\N	0
11111111-2222-3333-4444-555555555555	11111111-1111-1111-1111-111111111111	Rose House	\N	\N	\N	active	0	\N	\N	\N	2026-04-30 13:04:53.336216+02	2026-04-30 13:04:53.336216+02	t	11111111-1111-1111-1111-111111111102	\N	\N	{}	\N	2026-05-02 06:00:00.408171+02	0
22222222-2222-3333-4444-555555555555	11111111-1111-1111-1111-111111111111	Oak Lodge	45 Oak Lane, Bristol BS1 2AB	\N	\N	active	6	\N	\N	\N	2026-05-01 04:24:14.974617+02	2026-05-01 04:24:14.974617+02	t	11111111-1111-1111-1111-111111111102	\N	\N	{}	2026-05-02 00:00:00.526459+02	2026-05-01 19:14:23.315871+02	43200
\.


--
-- Data for Name: incident_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incident_attachments (id, incident_id, company_id, file_name, file_url, file_size, mime_type, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: incident_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incident_categories (id, company_id, name, description, reportable, created_at) FROM stdin;
\.


--
-- Data for Name: incident_escalations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incident_escalations (id, incident_id, escalation_id, linked_at) FROM stdin;
\.


--
-- Data for Name: incident_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incident_events (id, incident_id, company_id, event_type, title, description, metadata, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: incident_reconstruction; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incident_reconstruction (id, company_id, house_id, incident_id, status, reconstruction_date, lead_investigator, s1_metadata, s2_incident_summary, s3_chronology, s4_signal_chain, s5_trajectory_at_time, s6_contributing_factors, s7_control_weaknesses, s8_staffing_context, s9_governance_oversight, s10_resident_impact, s11_family_external_comms, s12_immediate_actions_taken, s13_systemic_lessons, s14_investigator_observations, s15_narrative_summary, s16_recommendations, s17_director_signoff, completed_at, completed_by, approved_at, approved_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: incident_reconstruction_pulses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incident_reconstruction_pulses (id, reconstruction_id, pulse_id, linked_at) FROM stdin;
\.


--
-- Data for Name: incident_reconstructions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incident_reconstructions (id, company_id, service_unit_id, incident_id, incident_date, incident_type, reconstruction_method, timeline_events, governance_awareness, post_incident_actions, contributing_factors, governance_learning, governance_conclusion, director_statement, generated_by, status, locked_at, locked_by, created_at) FROM stdin;
\.


--
-- Data for Name: incident_risks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incident_risks (id, incident_id, risk_id, linked_at) FROM stdin;
\.


--
-- Data for Name: incidents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incidents (id, company_id, house_id, category_id, title, description, severity, status, occurred_at, reported_at, location, persons_involved, witnesses, immediate_action, follow_up_required, reportable_to_authority, authority_notified_at, created_by, assigned_to, resolved_at, metadata, created_at, updated_at, linked_risk_id, category, is_active) FROM stdin;
155333cd-d0ab-4764-958e-32d812b0cf82	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	Incident 0 - Rose House	Details of historical incident.	Critical	Open	2026-05-02 07:31:02.818+02	2026-05-02 07:31:02.564227+02	\N	[]	[]	\N	f	f	\N	11111111-1111-1111-1111-111111111102	\N	\N	{}	2026-05-02 07:31:02.818+02	2026-05-02 07:31:02.564227+02	\N	\N	t
dfd74e1f-96a4-4574-9e2c-f22cbafd8847	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	Incident 1 - Rose House	Details of historical incident.	High	Resolved	2026-04-22 07:31:02.819+02	2026-05-02 07:31:02.564227+02	\N	[]	[]	\N	f	f	\N	11111111-1111-1111-1111-111111111102	\N	\N	{}	2026-04-22 07:31:02.819+02	2026-05-02 07:31:02.564227+02	\N	\N	t
36319c77-03a5-4e2e-a446-058446168d54	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	\N	Incident 2 - Rose House	Details of historical incident.	High	Resolved	2026-04-12 07:31:02.82+02	2026-05-02 07:31:02.564227+02	\N	[]	[]	\N	f	f	\N	11111111-1111-1111-1111-111111111102	\N	\N	{}	2026-04-12 07:31:02.82+02	2026-05-02 07:31:02.564227+02	\N	\N	t
bfd8caac-1dbf-4c2f-afc0-43a3ee0b84de	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	Incident 0 - Oak Lodge	Details of historical incident.	Critical	Open	2026-05-02 07:31:02.82+02	2026-05-02 07:31:02.564227+02	\N	[]	[]	\N	f	f	\N	11111111-1111-1111-1111-111111111102	\N	\N	{}	2026-05-02 07:31:02.82+02	2026-05-02 07:31:02.564227+02	\N	\N	t
ce7ae6f7-595c-4164-9a87-686549934557	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	Incident 1 - Oak Lodge	Details of historical incident.	High	Resolved	2026-04-22 07:31:02.821+02	2026-05-02 07:31:02.564227+02	\N	[]	[]	\N	f	f	\N	11111111-1111-1111-1111-111111111102	\N	\N	{}	2026-04-22 07:31:02.821+02	2026-05-02 07:31:02.564227+02	\N	\N	t
887473d2-7cb6-479b-b408-bb38bcc5d61c	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	\N	Incident 2 - Oak Lodge	Details of historical incident.	High	Resolved	2026-04-12 07:31:02.822+02	2026-05-02 07:31:02.564227+02	\N	[]	[]	\N	f	f	\N	11111111-1111-1111-1111-111111111102	\N	\N	{}	2026-04-12 07:31:02.822+02	2026-05-02 07:31:02.564227+02	\N	\N	t
30afac60-2cf1-4d04-9cf3-1bf39cef79c3	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	Incident 0 - Maple Court	Details of historical incident.	Critical	Open	2026-05-02 07:31:02.822+02	2026-05-02 07:31:02.564227+02	\N	[]	[]	\N	f	f	\N	11111111-1111-1111-1111-111111111106	\N	\N	{}	2026-05-02 07:31:02.822+02	2026-05-02 07:31:02.564227+02	\N	\N	t
c1392327-0ea8-4ce0-b75b-3f362ee72913	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	Incident 1 - Maple Court	Details of historical incident.	High	Resolved	2026-04-22 07:31:02.823+02	2026-05-02 07:31:02.564227+02	\N	[]	[]	\N	f	f	\N	11111111-1111-1111-1111-111111111106	\N	\N	{}	2026-04-22 07:31:02.823+02	2026-05-02 07:31:02.564227+02	\N	\N	t
37deb9a7-9770-4319-9bc6-0c66c26307d5	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	\N	Incident 2 - Maple Court	Details of historical incident.	High	Resolved	2026-04-12 07:31:02.824+02	2026-05-02 07:31:02.564227+02	\N	[]	[]	\N	f	f	\N	11111111-1111-1111-1111-111111111106	\N	\N	{}	2026-04-12 07:31:02.824+02	2026-05-02 07:31:02.564227+02	\N	\N	t
\.


--
-- Data for Name: job_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_logs (id, job_id, level, message, data, created_at) FROM stdin;
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobs (id, company_id, queue_name, job_type, status, payload, result, error_message, attempts, max_attempts, scheduled_at, started_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: monthly_board_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.monthly_board_reports (id, report_period_start, report_period_end, generated_by, generated_at, draft_narrative, final_narrative, status, pdf_url, company_id) FROM stdin;
\.


--
-- Data for Name: monthly_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.monthly_reports (id, company_id, report_month, executive_summary, stability_snapshot, risk_heatmap, escalation_summary, trend_indicators, governance_performance, learning_actions, board_assurance_statement, signed_by, co_signed_by, status, locked_at, locked_by, created_at) FROM stdin;
\.


--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_preferences (id, user_id, company_id, email_enabled, in_app_enabled, sms_enabled, risk_alerts, incident_alerts, governance_reminders, escalation_alerts, report_completed, quiet_hours_start, quiet_hours_end, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, company_id, user_id, type, title, body, read, read_at, data, link, created_at, is_read) FROM stdin;
505e1e3b-f0ad-4912-858d-f3481b6f13ad	11111111-1111-1111-1111-111111111111	11111111-1111-1111-1111-111111111104	GOVERNANCE_ABSENCE_72H	Escalation: Missed Governance Review – Rose House	The daily oversight review for Rose House has now been missed for 72 consecutive hours. The review was previously reassigned to the Deputy RM but remains incomplete.\n\nThis constitutes a governance gap under CQC Well-Led standards. Please ensure oversight is restored immediately.	f	\N	{"channels": ["in_app"], "house_id": "11111111-2222-3333-4444-555555555555", "dispatched_at": "2026-05-01T06:00:00.748Z", "escalation_level": "Critical"}	\N	2026-05-01 08:00:00.72913+02	f
147e44ed-2f1f-4ff0-bca3-1f06875a1711	11111111-1111-1111-1111-111111111111	4eab640f-da2f-4b1e-af77-84da540c24b6	GOVERNANCE_ABSENCE_72H	Escalation: Missed Governance Review – Maple Court	The daily oversight review for Maple Court has now been missed for 72 consecutive hours. The review was previously reassigned to the Deputy RM but remains incomplete.\n\nThis constitutes a governance gap under CQC Well-Led standards. Please ensure oversight is restored immediately.	f	\N	{"channels": ["in_app"], "house_id": "33333333-3333-3333-4444-555555555555", "dispatched_at": "2026-05-02T06:00:00.502Z", "escalation_level": "Critical"}	\N	2026-05-02 08:00:00.093387+02	f
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, name, resource, action, description, created_at) FROM stdin;
\.


--
-- Data for Name: pulse_risk_links; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pulse_risk_links (id, pulse_id, risk_id, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: report_cache; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_cache (id, company_id, cache_key, data, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: report_exports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_exports (id, report_id, company_id, format, file_url, downloaded_by, downloaded_at, created_at) FROM stdin;
\.


--
-- Data for Name: report_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_requests (id, company_id, report_id, requested_by, report_type, parameters, status, job_id, created_at) FROM stdin;
337bfdee-b4ec-45f3-99b1-4c9fcde1486b	11111111-1111-1111-1111-111111111111	c856efca-38b2-4d80-86f4-78ae50edb95b	11111111-1111-1111-1111-111111111102	risk_summary	{"houses": [], "status": [], "date_to": "2026-05-01", "house_id": "11111111-2222-3333-4444-555555555555", "severity": [], "date_from": "2026-04-01", "categories": []}	queued	25	2026-05-01 19:56:53.121656+02
c975ec07-b216-4d85-919e-7fc63b79a2be	11111111-1111-1111-1111-111111111111	41e0a5b1-3c50-410c-8c4e-cb844287cc0c	11111111-1111-1111-1111-111111111102	organizational_monthly	{"houses": [], "status": [], "date_to": "2026-05-02", "house_id": "11111111-2222-3333-4444-555555555555", "severity": [], "date_from": "2026-04-02", "categories": []}	queued	26	2026-05-02 03:09:22.064431+02
1614d7f3-e00d-433c-9e23-02eaad8ba6b1	11111111-1111-1111-1111-111111111111	1610e6f8-d004-4e68-a1b3-5785d9ce938a	11111111-1111-1111-1111-111111111102	organizational_monthly	{"houses": [], "status": [], "date_to": "2026-05-02", "house_id": "11111111-2222-3333-4444-555555555555", "severity": [], "date_from": "2026-04-02", "categories": []}	queued	27	2026-05-02 03:10:02.568451+02
98bd87a5-601d-458c-ace3-899e2a10f8ff	11111111-1111-1111-1111-111111111111	993479ae-7dc7-4bc0-ae40-3ec3f5e5cfcc	11111111-1111-1111-1111-111111111102	governance_compliance	{"houses": [], "status": [], "date_to": "2026-05-02", "house_id": "11111111-2222-3333-4444-555555555555", "severity": [], "date_from": "2026-04-02", "categories": []}	queued	28	2026-05-02 03:11:41.404139+02
db88450c-a392-4e3c-bbbc-46689bb1ce27	11111111-1111-1111-1111-111111111111	971bf978-76b8-476c-b880-b17e3a633441	4eab640f-da2f-4b1e-af77-84da540c24b6	governance_compliance	{"houses": [], "status": [], "date_to": "2026-05-02", "severity": [], "date_from": "2026-04-02", "categories": []}	queued	29	2026-05-02 04:41:25.89383+02
30fcdf9d-8eb2-420c-9428-082bd763c882	11111111-1111-1111-1111-111111111111	f2f48e71-a032-43b4-a479-68846c055e9e	4eab640f-da2f-4b1e-af77-84da540c24b6	cross_site_summary	{"houses": [], "status": [], "date_to": "2026-05-02", "severity": [], "date_from": "2026-04-02", "categories": []}	queued	30	2026-05-02 04:41:39.790286+02
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports (id, company_id, type, name, status, generated_by, file_url, file_size, parameters, error_message, completed_at, expires_at, created_at) FROM stdin;
c856efca-38b2-4d80-86f4-78ae50edb95b	11111111-1111-1111-1111-111111111111	risk_summary	Governance Report - 01/05/2026	pending	11111111-1111-1111-1111-111111111102	\N	\N	{"houses": [], "status": [], "date_to": "2026-05-01", "house_id": "11111111-2222-3333-4444-555555555555", "severity": [], "date_from": "2026-04-01", "categories": []}	\N	\N	\N	2026-05-01 19:56:53.112193+02
41e0a5b1-3c50-410c-8c4e-cb844287cc0c	11111111-1111-1111-1111-111111111111	organizational_monthly	Governance Report - 02/05/2026	pending	11111111-1111-1111-1111-111111111102	\N	\N	{"houses": [], "status": [], "date_to": "2026-05-02", "house_id": "11111111-2222-3333-4444-555555555555", "severity": [], "date_from": "2026-04-02", "categories": []}	\N	\N	\N	2026-05-02 03:09:22.057314+02
1610e6f8-d004-4e68-a1b3-5785d9ce938a	11111111-1111-1111-1111-111111111111	organizational_monthly	Governance Report - 02/05/2026	completed	11111111-1111-1111-1111-111111111102	/reports/1610e6f8-d004-4e68-a1b3-5785d9ce938a.pdf	\N	{"houses": [], "status": [], "date_to": "2026-05-02", "house_id": "11111111-2222-3333-4444-555555555555", "severity": [], "date_from": "2026-04-02", "categories": []}	\N	2026-05-02 03:10:02.669908+02	\N	2026-05-02 03:10:02.562333+02
993479ae-7dc7-4bc0-ae40-3ec3f5e5cfcc	11111111-1111-1111-1111-111111111111	governance_compliance	Governance Report - 02/05/2026	pending	11111111-1111-1111-1111-111111111102	\N	\N	{"houses": [], "status": [], "date_to": "2026-05-02", "house_id": "11111111-2222-3333-4444-555555555555", "severity": [], "date_from": "2026-04-02", "categories": []}	\N	\N	\N	2026-05-02 03:11:41.395596+02
971bf978-76b8-476c-b880-b17e3a633441	11111111-1111-1111-1111-111111111111	governance_compliance	Governance Report - 02/05/2026	pending	4eab640f-da2f-4b1e-af77-84da540c24b6	\N	\N	{"houses": [], "status": [], "date_to": "2026-05-02", "severity": [], "date_from": "2026-04-02", "categories": []}	\N	\N	\N	2026-05-02 04:41:25.881931+02
f2f48e71-a032-43b4-a479-68846c055e9e	11111111-1111-1111-1111-111111111111	cross_site_summary	Governance Report - 02/05/2026	completed	4eab640f-da2f-4b1e-af77-84da540c24b6	/reports/f2f48e71-a032-43b4-a479-68846c055e9e.pdf	\N	{"houses": [], "status": [], "date_to": "2026-05-02", "severity": [], "date_from": "2026-04-02", "categories": []}	\N	2026-05-02 04:41:39.872305+02	\N	2026-05-02 04:41:39.781411+02
\.


--
-- Data for Name: ri_acknowledgements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ri_acknowledgements (id, incident_id, ri_user_id, acknowledged_at, acknowledgement_text, is_statutory_notification, statutory_body_reference, requires_follow_up) FROM stdin;
\.


--
-- Data for Name: ri_queries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ri_queries (id, weekly_review_id, ri_user_id, rm_user_id, query_text, query_sent_at, resolved_at, rm_response_text, is_escalated_to_director) FROM stdin;
\.


--
-- Data for Name: risk_actions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.risk_actions (id, risk_id, company_id, title, description, status, verified_by_rm, verified_at_rm, verified_by_ri, verified_at_ri, verification_notes, assigned_to, due_date, completed_at, created_by, created_at, updated_at, linked_review_id, effectiveness_reviewed_at, effectiveness_reviewed_by, calculated_outcome, rm_override_outcome, director_override_outcome, effectiveness_measured_at) FROM stdin;
e1f60a1f-43aa-40ca-882e-84c2b1cc2ffe	861bbce6-1ec1-41b4-aa94-c6be53c50539	11111111-1111-1111-1111-111111111111	Immediate Review	Review all relevant care plans.	In Progress	\N	\N	\N	\N	\N	\N	2026-05-09 07:31:02.564227+02	\N	11111111-1111-1111-1111-111111111102	2026-05-02 07:31:02.794+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
82ef9f2a-a960-4fe0-aeaf-010d3896bdd3	861bbce6-1ec1-41b4-aa94-c6be53c50539	11111111-1111-1111-1111-111111111111	Staff Briefing	Ensure all staff are briefed on new protocols.	Completed	\N	\N	\N	\N	\N	\N	2026-05-02 07:31:02.794+02	2026-05-02 07:31:02.794+02	11111111-1111-1111-1111-111111111102	2026-05-02 07:31:02.794+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
5d8179bd-92fd-4cc5-a2b0-ec42110e83c5	4082081b-fda3-4473-8a2a-72154e276d52	11111111-1111-1111-1111-111111111111	Immediate Review	Review all relevant care plans.	In Progress	\N	\N	\N	\N	\N	\N	2026-05-09 07:31:02.564227+02	\N	11111111-1111-1111-1111-111111111102	2026-04-25 07:31:02.796+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
e6dfa3da-76b9-42c3-8724-4246c4cac5b4	4082081b-fda3-4473-8a2a-72154e276d52	11111111-1111-1111-1111-111111111111	Staff Briefing	Ensure all staff are briefed on new protocols.	Completed	\N	\N	\N	\N	\N	\N	2026-04-25 07:31:02.796+02	2026-04-25 07:31:02.796+02	11111111-1111-1111-1111-111111111102	2026-04-25 07:31:02.796+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
454f5b44-1c13-4542-91fd-a485dc71c169	ddd5868e-5ba1-46ed-8728-bb862042b396	11111111-1111-1111-1111-111111111111	Immediate Review	Review all relevant care plans.	In Progress	\N	\N	\N	\N	\N	\N	2026-05-09 07:31:02.564227+02	\N	11111111-1111-1111-1111-111111111102	2026-04-18 07:31:02.798+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
29e31c08-82fc-4451-b02d-9af538a9eb6a	ddd5868e-5ba1-46ed-8728-bb862042b396	11111111-1111-1111-1111-111111111111	Staff Briefing	Ensure all staff are briefed on new protocols.	Completed	\N	\N	\N	\N	\N	\N	2026-04-18 07:31:02.798+02	2026-04-18 07:31:02.798+02	11111111-1111-1111-1111-111111111102	2026-04-18 07:31:02.798+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
f6495140-e3b2-4519-a747-9d6a30f1b0dd	5a6a6cd7-8069-455e-88ae-4d4200bba326	11111111-1111-1111-1111-111111111111	Immediate Review	Review all relevant care plans.	In Progress	\N	\N	\N	\N	\N	\N	2026-05-09 07:31:02.564227+02	\N	11111111-1111-1111-1111-111111111102	2026-04-11 07:31:02.801+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
c76e8bc7-6324-480c-8892-8c3e5c4bbe80	5a6a6cd7-8069-455e-88ae-4d4200bba326	11111111-1111-1111-1111-111111111111	Staff Briefing	Ensure all staff are briefed on new protocols.	Completed	\N	\N	\N	\N	\N	\N	2026-04-11 07:31:02.801+02	2026-04-11 07:31:02.801+02	11111111-1111-1111-1111-111111111102	2026-04-11 07:31:02.801+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
ae921569-711c-46d4-b345-e8f7032e3a15	46593a2f-5d99-48fa-9da2-a84a866e3ee8	11111111-1111-1111-1111-111111111111	Immediate Review	Review all relevant care plans.	In Progress	\N	\N	\N	\N	\N	\N	2026-05-09 07:31:02.564227+02	\N	11111111-1111-1111-1111-111111111102	2026-05-02 07:31:02.803+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
6692bb6e-4660-4331-ad66-84525cbea67d	46593a2f-5d99-48fa-9da2-a84a866e3ee8	11111111-1111-1111-1111-111111111111	Staff Briefing	Ensure all staff are briefed on new protocols.	Completed	\N	\N	\N	\N	\N	\N	2026-05-02 07:31:02.803+02	2026-05-02 07:31:02.803+02	11111111-1111-1111-1111-111111111102	2026-05-02 07:31:02.803+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
d8ff951d-0314-40c2-ac73-4e329df968d7	838fdd3d-8afc-42e3-8a25-c6de325df75b	11111111-1111-1111-1111-111111111111	Immediate Review	Review all relevant care plans.	In Progress	\N	\N	\N	\N	\N	\N	2026-05-09 07:31:02.564227+02	\N	11111111-1111-1111-1111-111111111102	2026-04-25 07:31:02.805+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
a36ae097-be74-4f18-9e5c-a3e0ad8dd605	838fdd3d-8afc-42e3-8a25-c6de325df75b	11111111-1111-1111-1111-111111111111	Staff Briefing	Ensure all staff are briefed on new protocols.	Completed	\N	\N	\N	\N	\N	\N	2026-04-25 07:31:02.805+02	2026-04-25 07:31:02.805+02	11111111-1111-1111-1111-111111111102	2026-04-25 07:31:02.805+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
9e027011-0ddd-4ffc-b613-2d787713c7af	30478444-4337-44ba-9641-5306300b4950	11111111-1111-1111-1111-111111111111	Immediate Review	Review all relevant care plans.	In Progress	\N	\N	\N	\N	\N	\N	2026-05-09 07:31:02.564227+02	\N	11111111-1111-1111-1111-111111111102	2026-04-18 07:31:02.807+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
17c234c3-d1b5-4b44-ad36-4ca05f62e40c	30478444-4337-44ba-9641-5306300b4950	11111111-1111-1111-1111-111111111111	Staff Briefing	Ensure all staff are briefed on new protocols.	Completed	\N	\N	\N	\N	\N	\N	2026-04-18 07:31:02.807+02	2026-04-18 07:31:02.807+02	11111111-1111-1111-1111-111111111102	2026-04-18 07:31:02.807+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
b4b353eb-8165-4076-b086-a3dfc060ce2a	63e1ca5c-eaae-477a-be5d-582cd8432e78	11111111-1111-1111-1111-111111111111	Immediate Review	Review all relevant care plans.	In Progress	\N	\N	\N	\N	\N	\N	2026-05-09 07:31:02.564227+02	\N	11111111-1111-1111-1111-111111111102	2026-04-11 07:31:02.808+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
e8caa768-b89b-45cb-8579-4db6fa488e09	63e1ca5c-eaae-477a-be5d-582cd8432e78	11111111-1111-1111-1111-111111111111	Staff Briefing	Ensure all staff are briefed on new protocols.	Completed	\N	\N	\N	\N	\N	\N	2026-04-11 07:31:02.808+02	2026-04-11 07:31:02.808+02	11111111-1111-1111-1111-111111111102	2026-04-11 07:31:02.808+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
0ccba89e-8795-4366-9554-1b6e9d0cb4e4	796a6a24-48ae-4924-8c38-5162fc262410	11111111-1111-1111-1111-111111111111	Immediate Review	Review all relevant care plans.	In Progress	\N	\N	\N	\N	\N	\N	2026-05-09 07:31:02.564227+02	\N	11111111-1111-1111-1111-111111111106	2026-05-02 07:31:02.81+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
1668149e-e28b-4707-aa3c-b8d57ca63e88	796a6a24-48ae-4924-8c38-5162fc262410	11111111-1111-1111-1111-111111111111	Staff Briefing	Ensure all staff are briefed on new protocols.	Completed	\N	\N	\N	\N	\N	\N	2026-05-02 07:31:02.81+02	2026-05-02 07:31:02.81+02	11111111-1111-1111-1111-111111111106	2026-05-02 07:31:02.81+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
c3539232-adff-40d7-be0b-929481198e58	474463cf-8c25-44a7-a739-4557d544edc6	11111111-1111-1111-1111-111111111111	Immediate Review	Review all relevant care plans.	In Progress	\N	\N	\N	\N	\N	\N	2026-05-09 07:31:02.564227+02	\N	11111111-1111-1111-1111-111111111106	2026-04-25 07:31:02.812+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
8a11f45f-ce7c-4238-882e-8b9684acf1ec	474463cf-8c25-44a7-a739-4557d544edc6	11111111-1111-1111-1111-111111111111	Staff Briefing	Ensure all staff are briefed on new protocols.	Completed	\N	\N	\N	\N	\N	\N	2026-04-25 07:31:02.812+02	2026-04-25 07:31:02.812+02	11111111-1111-1111-1111-111111111106	2026-04-25 07:31:02.812+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
4abd38f0-6c53-4eb5-920c-d1b85c21671c	71ea1457-ff7f-4926-9d21-4dedf73fe185	11111111-1111-1111-1111-111111111111	Immediate Review	Review all relevant care plans.	In Progress	\N	\N	\N	\N	\N	\N	2026-05-09 07:31:02.564227+02	\N	11111111-1111-1111-1111-111111111106	2026-04-18 07:31:02.813+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
f242deb6-7841-487a-b1b7-d6c79f8d00ee	71ea1457-ff7f-4926-9d21-4dedf73fe185	11111111-1111-1111-1111-111111111111	Staff Briefing	Ensure all staff are briefed on new protocols.	Completed	\N	\N	\N	\N	\N	\N	2026-04-18 07:31:02.813+02	2026-04-18 07:31:02.813+02	11111111-1111-1111-1111-111111111106	2026-04-18 07:31:02.813+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
1f0237ce-597d-4c28-981b-f2953e59fec0	b6bc1c36-8405-4536-ba80-1904bef02c97	11111111-1111-1111-1111-111111111111	Immediate Review	Review all relevant care plans.	In Progress	\N	\N	\N	\N	\N	\N	2026-05-09 07:31:02.564227+02	\N	11111111-1111-1111-1111-111111111106	2026-04-11 07:31:02.815+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
4a98f004-027a-45d6-95e6-dffa80d5803f	b6bc1c36-8405-4536-ba80-1904bef02c97	11111111-1111-1111-1111-111111111111	Staff Briefing	Ensure all staff are briefed on new protocols.	Completed	\N	\N	\N	\N	\N	\N	2026-04-11 07:31:02.815+02	2026-04-11 07:31:02.815+02	11111111-1111-1111-1111-111111111106	2026-04-11 07:31:02.815+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: risk_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.risk_attachments (id, risk_id, company_id, file_name, file_url, file_size, mime_type, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: risk_candidates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.risk_candidates (id, company_id, house_id, cluster_id, risk_domain, candidate_type, source_signals, status, dismissal_reason, created_at, updated_at, linked_risk_id) FROM stdin;
6e9050a5-91b9-43e6-a92f-5bfbf49353fe	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	69e8bd1e-c6e3-42dc-bffe-da2fc01c677c	Behaviour	Risk Review Required	{}	New	\N	2026-05-02 07:31:02.564227+02	2026-05-02 07:31:02.564227+02	\N
f0bdd826-a93a-4ac8-a251-96c2b2063bbd	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	c1c3e37d-028f-485b-a537-a9172289fc09	Medication	Risk Review Required	{}	New	\N	2026-05-02 07:31:02.564227+02	2026-05-02 07:31:02.564227+02	\N
fba25f3e-80af-4968-96ab-db96b909f1ce	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	108c8bee-8987-4b4b-a5ba-50cc16732a1e	Staffing	Risk Review Required	{}	New	\N	2026-05-02 07:31:02.564227+02	2026-05-02 07:31:02.564227+02	\N
80ff9519-c8a7-47df-be6c-804ba937b10d	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	2bbf4181-8f4f-406b-a834-1678b899b8c2	Behaviour	Risk Review Required	{}	New	\N	2026-05-02 07:31:02.564227+02	2026-05-02 07:31:02.564227+02	\N
53581cab-63c8-4927-9dcf-2e86611861e2	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	46529876-d6d2-450a-bcff-f4e6f1bd5d71	Medication	Risk Review Required	{}	New	\N	2026-05-02 07:31:02.564227+02	2026-05-02 07:31:02.564227+02	\N
f585c1c8-e31f-4d4a-8d06-70b9c7397928	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	fc7928d4-81ba-46c9-956b-ba124c2ef068	Staffing	Risk Review Required	{}	New	\N	2026-05-02 07:31:02.564227+02	2026-05-02 07:31:02.564227+02	\N
a05317eb-24a3-403b-bc80-3670d00867b4	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	c27a748a-2855-4aae-957a-b3474ab592c0	Behaviour	Risk Review Required	{}	New	\N	2026-05-02 07:31:02.564227+02	2026-05-02 07:31:02.564227+02	\N
59268932-c24d-431c-a785-71e6d9c8aba7	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	a5ebb78e-1589-430d-b25f-43a02a9cbe0a	Medication	Risk Review Required	{}	New	\N	2026-05-02 07:31:02.564227+02	2026-05-02 07:31:02.564227+02	\N
25072fdc-198d-4128-b1c3-7c1b85c66a1a	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	7368ce8b-d8bd-4626-af80-7c5964a7ee9c	Staffing	Risk Review Required	{}	New	\N	2026-05-02 07:31:02.564227+02	2026-05-02 07:31:02.564227+02	\N
\.


--
-- Data for Name: risk_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.risk_categories (id, company_id, name, description, color, created_at) FROM stdin;
77fa2f3a-6970-4b7b-b104-fbd5aa1ed0d3	11111111-1111-1111-1111-111111111111	Clinical & Care	Risks related to clinical practice and care delivery	#DC2626	2026-05-01 05:02:40.359229+02
1ed06c89-c221-4088-a4cf-39a2f55541fe	11111111-1111-1111-1111-111111111111	Safeguarding	Safeguarding concerns and adult protection	#EA580C	2026-05-01 05:02:40.363918+02
203697cc-c6bd-4d8f-a04c-16415b1781b6	11111111-1111-1111-1111-111111111111	Staffing & Workforce	Staff competence, recruitment, and capacity	#0891B2	2026-05-01 05:02:40.366712+02
c778d237-585c-477b-929f-c0d06199ae52	11111111-1111-1111-1111-111111111111	Environmental	Premises, equipment and environmental hazards	#7C3AED	2026-05-01 05:02:40.367342+02
142a47da-b933-4d6d-8d61-5819ef007c8e	11111111-1111-1111-1111-111111111111	Infection Control	Infection prevention and outbreak management	#BE185D	2026-05-01 05:02:40.367935+02
484775f7-9852-46bc-a9b5-cc838b786495	11111111-1111-1111-1111-111111111111	Behaviour	Behavioural concerns and support needs	#65A30D	2026-05-01 05:02:40.366029+02
e92e1c94-3ac4-4d1e-be58-3e0ec8045d77	11111111-1111-1111-1111-111111111111	Medication	Medication errors, administration and storage	#D97706	2026-05-01 05:02:40.364585+02
d3861712-8837-4546-aee8-37f1da6f71c9	11111111-1111-1111-1111-111111111111	Staffing	Falls prevention and mobility risks	#CA8A04	2026-05-01 05:02:40.36535+02
\.


--
-- Data for Name: risk_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.risk_events (id, risk_id, company_id, event_type, description, created_by, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: risk_signal_links; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.risk_signal_links (id, risk_id, pulse_entry_id, linked_by, linked_at, link_note, cluster_id) FROM stdin;
\.


--
-- Data for Name: risks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.risks (id, company_id, house_id, category_id, source_cluster_id, title, description, severity, trajectory, status, likelihood, impact, assigned_to, created_by, control_effectiveness, next_review_date, review_due_date, last_reviewed_at, resolved_at, closure_reason, metadata, created_at, updated_at, last_linked_signal_date, recurrence_watch_until, reopened_at, closed_at, risk_domain, is_active) FROM stdin;
861bbce6-1ec1-41b4-aa94-c6be53c50539	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	484775f7-9852-46bc-a9b5-cc838b786495	\N	Formal Behaviour Risk - Rose House	Ongoing concerns regarding Behaviour identified via governance loop.	Low	Stable	Open	3	3	11111111-1111-1111-1111-111111111102	11111111-1111-1111-1111-111111111102	Partially	\N	\N	\N	\N	\N	{}	2026-05-02 07:31:02.794+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	t
4082081b-fda3-4473-8a2a-72154e276d52	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	e92e1c94-3ac4-4d1e-be58-3e0ec8045d77	\N	Formal Medication Risk - Rose House	Ongoing concerns regarding Medication identified via governance loop.	Moderate	Improving	Open	3	3	11111111-1111-1111-1111-111111111102	11111111-1111-1111-1111-111111111102	Partially	\N	\N	\N	\N	\N	{}	2026-04-25 07:31:02.796+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	t
ddd5868e-5ba1-46ed-8728-bb862042b396	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	d3861712-8837-4546-aee8-37f1da6f71c9	\N	Formal Staffing Risk - Rose House	Ongoing concerns regarding Staffing identified via governance loop.	High	Deteriorating	Open	3	3	11111111-1111-1111-1111-111111111102	11111111-1111-1111-1111-111111111102	Partially	\N	\N	\N	\N	\N	{}	2026-04-18 07:31:02.798+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	t
5a6a6cd7-8069-455e-88ae-4d4200bba326	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	484775f7-9852-46bc-a9b5-cc838b786495	\N	Formal Behaviour Risk - Rose House	Ongoing concerns regarding Behaviour identified via governance loop.	Critical	Critical	Open	3	3	11111111-1111-1111-1111-111111111102	11111111-1111-1111-1111-111111111102	Partially	\N	\N	\N	\N	\N	{}	2026-04-11 07:31:02.801+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	t
46593a2f-5d99-48fa-9da2-a84a866e3ee8	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	484775f7-9852-46bc-a9b5-cc838b786495	\N	Formal Behaviour Risk - Oak Lodge	Ongoing concerns regarding Behaviour identified via governance loop.	Low	Stable	Open	3	3	11111111-1111-1111-1111-111111111102	11111111-1111-1111-1111-111111111102	Partially	\N	\N	\N	\N	\N	{}	2026-05-02 07:31:02.803+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	t
838fdd3d-8afc-42e3-8a25-c6de325df75b	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	e92e1c94-3ac4-4d1e-be58-3e0ec8045d77	\N	Formal Medication Risk - Oak Lodge	Ongoing concerns regarding Medication identified via governance loop.	Moderate	Improving	Open	3	3	11111111-1111-1111-1111-111111111102	11111111-1111-1111-1111-111111111102	Partially	\N	\N	\N	\N	\N	{}	2026-04-25 07:31:02.805+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	t
30478444-4337-44ba-9641-5306300b4950	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	d3861712-8837-4546-aee8-37f1da6f71c9	\N	Formal Staffing Risk - Oak Lodge	Ongoing concerns regarding Staffing identified via governance loop.	High	Deteriorating	Open	3	3	11111111-1111-1111-1111-111111111102	11111111-1111-1111-1111-111111111102	Partially	\N	\N	\N	\N	\N	{}	2026-04-18 07:31:02.807+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	t
63e1ca5c-eaae-477a-be5d-582cd8432e78	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	484775f7-9852-46bc-a9b5-cc838b786495	\N	Formal Behaviour Risk - Oak Lodge	Ongoing concerns regarding Behaviour identified via governance loop.	Critical	Critical	Open	3	3	11111111-1111-1111-1111-111111111102	11111111-1111-1111-1111-111111111102	Partially	\N	\N	\N	\N	\N	{}	2026-04-11 07:31:02.808+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	t
796a6a24-48ae-4924-8c38-5162fc262410	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	484775f7-9852-46bc-a9b5-cc838b786495	\N	Formal Behaviour Risk - Maple Court	Ongoing concerns regarding Behaviour identified via governance loop.	Low	Stable	Open	3	3	11111111-1111-1111-1111-111111111106	11111111-1111-1111-1111-111111111106	Partially	\N	\N	\N	\N	\N	{}	2026-05-02 07:31:02.81+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	t
474463cf-8c25-44a7-a739-4557d544edc6	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	e92e1c94-3ac4-4d1e-be58-3e0ec8045d77	\N	Formal Medication Risk - Maple Court	Ongoing concerns regarding Medication identified via governance loop.	Moderate	Improving	Open	3	3	11111111-1111-1111-1111-111111111106	11111111-1111-1111-1111-111111111106	Partially	\N	\N	\N	\N	\N	{}	2026-04-25 07:31:02.812+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	t
71ea1457-ff7f-4926-9d21-4dedf73fe185	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	d3861712-8837-4546-aee8-37f1da6f71c9	\N	Formal Staffing Risk - Maple Court	Ongoing concerns regarding Staffing identified via governance loop.	High	Deteriorating	Open	3	3	11111111-1111-1111-1111-111111111106	11111111-1111-1111-1111-111111111106	Partially	\N	\N	\N	\N	\N	{}	2026-04-18 07:31:02.813+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	t
b6bc1c36-8405-4536-ba80-1904bef02c97	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	484775f7-9852-46bc-a9b5-cc838b786495	\N	Formal Behaviour Risk - Maple Court	Ongoing concerns regarding Behaviour identified via governance loop.	Critical	Critical	Open	3	3	11111111-1111-1111-1111-111111111106	11111111-1111-1111-1111-111111111106	Partially	\N	\N	\N	\N	\N	{}	2026-04-11 07:31:02.815+02	2026-05-02 07:31:02.564227+02	\N	\N	\N	\N	\N	t
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (id, role_id, permission_id, created_at) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, created_at) FROM stdin;
2c446e0a-1a72-48b8-b964-e0068344c0dc	SUPER_ADMIN	Full system access across all tenants	2026-03-15 08:24:02.822609+02
6bd47d22-99e6-4f2f-843f-bd0617b623d3	ADMIN	Full access within a company tenant	2026-03-15 08:24:02.822609+02
a17f05ff-98aa-4776-887f-0a0bd473b7c5	DIRECTOR	Director-level access	2026-03-15 08:24:02.822609+02
827329a5-ffde-46ff-b572-1bb4d4692c21	REGISTERED_MANAGER	Registered Manager access	2026-03-15 08:24:02.822609+02
e09562f6-7d35-45f0-af9a-e34e2f978e5f	RESPONSIBLE_INDIVIDUAL	Responsible Individual access	2026-03-15 08:24:02.822609+02
f05d3eb4-3f48-4905-9cf5-e091e3edba34	TEAM_LEADER	Team Leader access	2026-03-24 21:36:48.595469+02
\.


--
-- Data for Name: signal_clusters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.signal_clusters (id, company_id, house_id, risk_domain, cluster_label, cluster_status, signal_count, first_signal_date, last_signal_date, trajectory, linked_risk_id, created_by_system, dismissed_by, dismiss_reason, created_at, updated_at) FROM stdin;
69e8bd1e-c6e3-42dc-bffe-da2fc01c677c	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	Behaviour	Behaviour Cluster - Rose House	Escalated	5	2026-04-22	2026-05-02	Deteriorating	\N	t	\N	\N	2026-04-22 07:31:02.783+02	2026-05-02 07:31:02.564227+02
c1c3e37d-028f-485b-a537-a9172289fc09	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	Medication	Medication Cluster - Rose House	Escalated	5	2026-04-22	2026-05-02	Deteriorating	\N	t	\N	\N	2026-04-22 07:31:02.786+02	2026-05-02 07:31:02.564227+02
108c8bee-8987-4b4b-a5ba-50cc16732a1e	11111111-1111-1111-1111-111111111111	11111111-2222-3333-4444-555555555555	Staffing	Staffing Cluster - Rose House	Escalated	5	2026-04-22	2026-05-02	Deteriorating	\N	t	\N	\N	2026-04-22 07:31:02.787+02	2026-05-02 07:31:02.564227+02
2bbf4181-8f4f-406b-a834-1678b899b8c2	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	Behaviour	Behaviour Cluster - Oak Lodge	Escalated	5	2026-04-22	2026-05-02	Deteriorating	\N	t	\N	\N	2026-04-22 07:31:02.788+02	2026-05-02 07:31:02.564227+02
46529876-d6d2-450a-bcff-f4e6f1bd5d71	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	Medication	Medication Cluster - Oak Lodge	Escalated	5	2026-04-22	2026-05-02	Deteriorating	\N	t	\N	\N	2026-04-22 07:31:02.789+02	2026-05-02 07:31:02.564227+02
fc7928d4-81ba-46c9-956b-ba124c2ef068	11111111-1111-1111-1111-111111111111	22222222-2222-3333-4444-555555555555	Staffing	Staffing Cluster - Oak Lodge	Escalated	5	2026-04-22	2026-05-02	Deteriorating	\N	t	\N	\N	2026-04-22 07:31:02.79+02	2026-05-02 07:31:02.564227+02
c27a748a-2855-4aae-957a-b3474ab592c0	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	Behaviour	Behaviour Cluster - Maple Court	Escalated	5	2026-04-22	2026-05-02	Deteriorating	\N	t	\N	\N	2026-04-22 07:31:02.792+02	2026-05-02 07:31:02.564227+02
a5ebb78e-1589-430d-b25f-43a02a9cbe0a	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	Medication	Medication Cluster - Maple Court	Escalated	5	2026-04-22	2026-05-02	Deteriorating	\N	t	\N	\N	2026-04-22 07:31:02.792+02	2026-05-02 07:31:02.564227+02
7368ce8b-d8bd-4626-af80-7c5964a7ee9c	11111111-1111-1111-1111-111111111111	33333333-3333-3333-4444-555555555555	Staffing	Staffing Cluster - Maple Court	Escalated	5	2026-04-22	2026-05-02	Deteriorating	\N	t	\N	\N	2026-04-22 07:31:02.793+02	2026-05-02 07:31:02.564227+02
\.


--
-- Data for Name: system_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_events (id, event_type, payload, created_at) FROM stdin;
a0815b5f-d04c-4aaa-bcd2-8fa7b0e564f2	governance_completed	{"pulse_id": "91b0e5dd-94dc-4323-807a-974f34cb08d4", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20", "compliance_score": 50}	2026-03-15 12:05:01.508326+02
dc7ad34e-2ad3-43f7-881f-6e9931da6f6c	risk_created	{"risk_id": "b8f5a034-b5c3-461c-a7a7-f2a0b0970db1", "severity": "high", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20", "created_by": "b75c6018-f84d-4b46-851f-91fb12c5e649"}	2026-03-15 12:05:01.543014+02
2911573d-8d51-4318-9321-07e61d4f6c1e	governance_completed	{"pulse_id": "8ad4854c-e7ca-410e-aa79-3030a3974b98", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20", "compliance_score": 100}	2026-03-15 12:09:21.923627+02
b2c103b7-e82f-45e8-8dca-0525532ead34	risk_created	{"risk_id": "a99ce4cb-0e44-4020-babc-45d317d646d4", "severity": "high", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20", "created_by": "b75c6018-f84d-4b46-851f-91fb12c5e649"}	2026-03-15 12:09:21.943586+02
fefa8ac7-14e4-47c0-8aa2-a58565f4ed62	report_requested	{"user_id": "b75c6018-f84d-4b46-851f-91fb12c5e649", "report_id": "421a4bd7-4816-422f-9202-d22cd5c0d51a", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20"}	2026-03-15 17:49:28.744215+02
1527c073-7b23-4dfe-bf8e-13d9448e5f5f	report_requested	{"user_id": "b75c6018-f84d-4b46-851f-91fb12c5e649", "report_id": "0bb480d7-bcf0-4ad7-94c6-5fd8303cf923", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20"}	2026-03-15 17:49:44.568227+02
492d2503-96ba-4fab-a07d-dc9960c6b37e	report_requested	{"user_id": "b75c6018-f84d-4b46-851f-91fb12c5e649", "report_id": "9c2a407f-bda7-4761-8d2c-ccddc0e84b92", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20"}	2026-03-15 17:56:58.413145+02
3faf1147-c401-474e-bca4-a4548c5278ae	report_completed	{"type": "incident_report", "file_url": "/reports/9c2a407f-bda7-4761-8d2c-ccddc0e84b92.json", "report_id": "9c2a407f-bda7-4761-8d2c-ccddc0e84b92", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20"}	2026-03-15 17:56:58.421344+02
4b41194b-3c2a-452a-86ac-20bf91f57893	report_requested	{"user_id": "b75c6018-f84d-4b46-851f-91fb12c5e649", "report_id": "e1c5c681-4933-4466-9ae1-eb1e2436eab7", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20"}	2026-03-15 19:41:10.9884+02
1ed41687-3311-4683-b1dd-563f450d4152	report_completed	{"type": "reconstruction_report", "file_url": "/reports/e1c5c681-4933-4466-9ae1-eb1e2436eab7.pdf", "report_id": "e1c5c681-4933-4466-9ae1-eb1e2436eab7", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20"}	2026-03-15 19:41:11.152472+02
3b89d181-03b6-4276-8298-a8638ef43df1	report_requested	{"user_id": "b75c6018-f84d-4b46-851f-91fb12c5e649", "report_id": "0676fcee-60a2-4a4d-8c40-244aed5752d4", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20"}	2026-03-15 19:41:47.570114+02
5396eaf8-462b-42f8-8084-08a4346635db	report_completed	{"type": "house_overview", "file_url": "/reports/0676fcee-60a2-4a4d-8c40-244aed5752d4.pdf", "report_id": "0676fcee-60a2-4a4d-8c40-244aed5752d4", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20"}	2026-03-15 19:41:47.677012+02
fc07139b-12a2-4bb6-804e-6c039c963dce	risk_created	{"risk_id": "c76a5d7b-73e9-4a95-a835-3192655174a0", "severity": "low", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20", "created_by": "b75c6018-f84d-4b46-851f-91fb12c5e649"}	2026-03-15 21:44:35.756325+02
9c435aa9-296e-40e2-a026-a4db242d441a	risk_created	{"risk_id": "49714857-b5fd-474f-a00c-727116c5fa07", "severity": "low", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20", "created_by": "b75c6018-f84d-4b46-851f-91fb12c5e649"}	2026-03-15 21:45:41.446311+02
af401b06-ba84-4d80-9ba2-58c153b2de1f	risk_created	{"risk_id": "c1fef006-e4c0-476c-8f73-f62a5dcd13c5", "severity": "low", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20", "created_by": "b75c6018-f84d-4b46-851f-91fb12c5e649"}	2026-03-15 21:46:36.120557+02
12d328b3-9f5d-4b8b-b582-480a2f94bb98	risk_created	{"risk_id": "763e7717-670a-40ee-a500-9c7e88106a16", "severity": "low", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20", "created_by": "b75c6018-f84d-4b46-851f-91fb12c5e649"}	2026-03-15 21:47:22.381271+02
0a9836b1-15bd-46a7-9909-216d75461f42	risk_created	{"risk_id": "5e5665a1-0816-4412-bc95-5b8fc137016f", "severity": "medium", "company_id": "d84b1e1a-268f-40d4-b555-280ed1d01a20", "created_by": "b75c6018-f84d-4b46-851f-91fb12c5e649"}	2026-03-15 21:48:05.975431+02
fbd7437d-322f-42d1-9c3c-16decaea3dbe	governance_completed	{"pulse_id": "58ac0313-1d14-4641-ac45-77fae9322b46", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d", "compliance_score": 80}	2026-03-25 22:04:51.079236+02
4ad627ad-4726-46c5-8628-921c7b3321ab	risk_created	{"risk_id": "d85c56cc-f64f-460e-bd92-53cc05428871", "severity": "Medium", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d", "created_by": "cb36f075-6084-4598-b963-e2532d9b3bd4"}	2026-03-25 23:54:19.267584+02
9bb256c0-c27b-40ac-91f6-349ed0e8e6ed	risk_escalated	{"risk_id": "d85c56cc-f64f-460e-bd92-53cc05428871", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d", "escalated_by": "cb36f075-6084-4598-b963-e2532d9b3bd4", "escalated_to": "eed04c46-84b7-4ed1-83bb-8b1f2c8c5c66"}	2026-03-26 00:10:41.481263+02
89404e31-0056-4fb9-9634-1b25de946a45	risk_escalated	{"risk_id": "d85c56cc-f64f-460e-bd92-53cc05428871", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d", "escalated_by": "cb36f075-6084-4598-b963-e2532d9b3bd4", "escalated_to": "eed04c46-84b7-4ed1-83bb-8b1f2c8c5c66"}	2026-03-26 00:11:50.343892+02
950260a1-0950-42aa-8fe8-7635d507a9fd	risk_escalated	{"risk_id": "d85c56cc-f64f-460e-bd92-53cc05428871", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d", "escalated_by": "cb36f075-6084-4598-b963-e2532d9b3bd4", "escalated_to": "eed04c46-84b7-4ed1-83bb-8b1f2c8c5c66"}	2026-03-26 09:25:51.913912+02
0944c2e5-f2dd-4fc6-9760-cb8543212944	report_requested	{"user_id": "28eb6795-1e02-4636-9e26-70aef5d0a4a3", "report_id": "ce8261f1-eef1-4309-9cd9-566fa4ea4246", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d"}	2026-03-29 05:28:39.002983+02
25b68292-75cf-44d3-87ee-98fa5df76807	report_completed	{"type": "house_overview", "file_url": "/reports/ce8261f1-eef1-4309-9cd9-566fa4ea4246.pdf", "report_id": "ce8261f1-eef1-4309-9cd9-566fa4ea4246", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d"}	2026-03-29 05:28:39.09545+02
e807f140-568f-4c17-b624-526d225ba978	report_requested	{"user_id": "28eb6795-1e02-4636-9e26-70aef5d0a4a3", "report_id": "8471a499-9bd9-4e91-92aa-53e935ab4d79", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d"}	2026-03-29 05:48:59.782506+02
f4efcafa-2296-4724-94ea-503eda7556c4	report_completed	{"type": "governance_compliance", "file_url": "/reports/8471a499-9bd9-4e91-92aa-53e935ab4d79.pdf", "report_id": "8471a499-9bd9-4e91-92aa-53e935ab4d79", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d"}	2026-03-29 05:49:00.275628+02
4b10d472-9108-4d00-9fcc-2050cf0c4a27	report_requested	{"user_id": "28eb6795-1e02-4636-9e26-70aef5d0a4a3", "report_id": "4f5abbf1-77c8-44fb-909a-d847f6c66122", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d"}	2026-03-29 05:49:24.754214+02
bb2dedcc-38d2-4c57-8c1b-3eae57b3cef8	report_requested	{"user_id": "28eb6795-1e02-4636-9e26-70aef5d0a4a3", "report_id": "4fed962e-5a92-46d5-8363-1c419466efd6", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d"}	2026-03-29 05:49:52.182589+02
dc1f721b-3408-4a61-a2f3-2a2d00824859	report_requested	{"user_id": "28eb6795-1e02-4636-9e26-70aef5d0a4a3", "report_id": "7dc38130-9bb3-4ff6-a6d6-95f32d0d260d", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d"}	2026-03-29 05:50:22.852817+02
a9da31ff-dfbd-4be1-a058-5d6e2f35ac37	report_completed	{"type": "house_overview", "file_url": "/reports/7dc38130-9bb3-4ff6-a6d6-95f32d0d260d.pdf", "report_id": "7dc38130-9bb3-4ff6-a6d6-95f32d0d260d", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d"}	2026-03-29 05:50:22.897556+02
630c22b8-e20f-4406-84f4-d67242581a9a	report_requested	{"user_id": "28eb6795-1e02-4636-9e26-70aef5d0a4a3", "report_id": "7189e439-f2e2-4362-90d9-d1bfbe8b9928", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d"}	2026-03-29 05:50:41.002592+02
2303e7c1-997e-4968-a2d0-0780aeaf39b1	report_completed	{"type": "custom", "file_url": "/reports/7189e439-f2e2-4362-90d9-d1bfbe8b9928.pdf", "report_id": "7189e439-f2e2-4362-90d9-d1bfbe8b9928", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d"}	2026-03-29 05:50:41.057044+02
7149fa1b-d36c-4fc1-9b05-c7acf6c3ed74	report_requested	{"user_id": "28eb6795-1e02-4636-9e26-70aef5d0a4a3", "report_id": "1b0227df-1db4-41cc-99df-f04ab870a4d5", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d"}	2026-03-29 05:51:07.401945+02
0dd18754-08cc-48dc-b3a6-231ec865cc41	report_completed	{"type": "risk_summary", "file_url": "/reports/1b0227df-1db4-41cc-99df-f04ab870a4d5.pdf", "report_id": "1b0227df-1db4-41cc-99df-f04ab870a4d5", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d"}	2026-03-29 05:51:07.474755+02
b0c6e5ee-e543-4016-ab89-9bc3d645097b	report_requested	{"user_id": "28eb6795-1e02-4636-9e26-70aef5d0a4a3", "report_id": "60705fa9-ef51-43dc-87d2-f8d2791efae7", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d"}	2026-03-29 05:51:22.037322+02
fb0c88b6-8322-42ed-b70f-530725807cda	report_completed	{"type": "incident_report", "file_url": "/reports/60705fa9-ef51-43dc-87d2-f8d2791efae7.pdf", "report_id": "60705fa9-ef51-43dc-87d2-f8d2791efae7", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d"}	2026-03-29 05:51:22.076579+02
86813d0a-ffee-4211-99d1-f4c383010417	governance_completed	{"pulse_id": "204a0740-89d2-4395-b972-e5b3d747e8a8", "company_id": "bb55ab56-3fc3-41e3-9bc4-a26e0b85b728", "compliance_score": 60}	2026-04-06 08:26:51.891649+02
39687bf3-fdca-432d-be86-2473e8a247de	risk_created	{"risk_id": "446dd583-eb52-4074-ab04-eaf4c2ef1b0c", "severity": "High", "company_id": "bb55ab56-3fc3-41e3-9bc4-a26e0b85b728", "created_by": "4a3cc1ce-43e5-40b8-822c-bebb3e197650"}	2026-04-06 08:26:51.95872+02
9e9a4a7a-d58e-4815-9c05-a5d730ababcf	risk_escalated	{"risk_id": "446dd583-eb52-4074-ab04-eaf4c2ef1b0c", "company_id": "bb55ab56-3fc3-41e3-9bc4-a26e0b85b728", "escalated_by": "4a3cc1ce-43e5-40b8-822c-bebb3e197650", "escalated_to": "405bf69f-4f59-4045-98c9-489a761bc108"}	2026-04-06 08:26:52.061411+02
93503cba-ff73-4e91-9d09-08bea8bf2088	risk_created	{"risk_id": "2025cb4e-839c-4808-9cfd-a75481c63e33", "severity": "High", "company_id": "bb55ab56-3fc3-41e3-9bc4-a26e0b85b728", "created_by": "4a3cc1ce-43e5-40b8-822c-bebb3e197650"}	2026-04-06 08:26:52.100769+02
6508f9f6-07c7-4c91-b277-91113bc35698	risk_escalated	{"risk_id": "2025cb4e-839c-4808-9cfd-a75481c63e33", "company_id": "bb55ab56-3fc3-41e3-9bc4-a26e0b85b728", "escalated_by": "4a3cc1ce-43e5-40b8-822c-bebb3e197650", "escalated_to": "405bf69f-4f59-4045-98c9-489a761bc108"}	2026-04-06 08:26:52.213705+02
71b1e695-d491-4dd1-8919-d43d602797c3	risk_created	{"risk_id": "ee5c7b58-a055-4c50-8687-24b933dac37f", "severity": "High", "company_id": "bb55ab56-3fc3-41e3-9bc4-a26e0b85b728", "created_by": "4a3cc1ce-43e5-40b8-822c-bebb3e197650"}	2026-04-06 08:26:52.282771+02
77f422e9-9b5a-4920-9f8e-e09144af5468	risk_escalated	{"risk_id": "ee5c7b58-a055-4c50-8687-24b933dac37f", "company_id": "bb55ab56-3fc3-41e3-9bc4-a26e0b85b728", "escalated_by": "4a3cc1ce-43e5-40b8-822c-bebb3e197650", "escalated_to": "405bf69f-4f59-4045-98c9-489a761bc108"}	2026-04-06 08:26:52.354857+02
ae443f32-c722-46b0-a640-40ea77fad72b	risk_created	{"risk_id": "09f3cfb3-582d-490f-b128-dc6b41e9776a", "severity": "Medium", "company_id": "bb55ab56-3fc3-41e3-9bc4-a26e0b85b728", "created_by": "4a3cc1ce-43e5-40b8-822c-bebb3e197650"}	2026-04-06 18:47:12.534677+02
743689cd-cd80-4531-8560-96302594a0b7	risk_created	{"risk_id": "b5c94d83-9820-44dc-87a1-8b99bbf85bac", "severity": "Low", "company_id": "bb55ab56-3fc3-41e3-9bc4-a26e0b85b728", "created_by": "4a3cc1ce-43e5-40b8-822c-bebb3e197650"}	2026-04-06 19:35:59.15921+02
83980ea4-9f45-4e6c-8b89-aa4392e45ec9	risk_created	{"risk_id": "cfb87bd3-7cbc-422c-8265-d23e4c34fa7d", "severity": "Medium", "company_id": "bb55ab56-3fc3-41e3-9bc4-a26e0b85b728", "created_by": "4a3cc1ce-43e5-40b8-822c-bebb3e197650"}	2026-04-06 19:48:36.017051+02
af4b1679-7ef8-4a90-b55c-d3f012241c76	incident_created	{"severity": "Low", "company_id": "bb55ab56-3fc3-41e3-9bc4-a26e0b85b728", "created_by": "4a3cc1ce-43e5-40b8-822c-bebb3e197650", "incident_id": "c251b83f-df69-497e-aff1-4a9bb3b9b096"}	2026-04-06 19:50:23.434537+02
320b21d1-dbbc-488a-b7b5-a82c391e26aa	governance_completed	{"pulse_id": "a28777ec-341c-4d95-bdd2-b6d507bd3cba", "company_id": "be009706-867e-47c3-8ec1-02305aa64bb8", "compliance_score": 100}	2026-04-07 22:25:29.645211+02
bc0923a0-4254-4353-8906-4dd6cfe05048	governance_completed	{"pulse_id": "7aab9b49-320c-431c-b8f1-fb4ab26e2bd0", "company_id": "9063544e-747d-4d50-b4a1-721a7dd8ec6d", "compliance_score": 100}	2026-04-07 23:02:08.927482+02
3e00b349-fa2e-4a2b-8a63-a55b3dd8125e	governance_completed	{"pulse_id": "72d9f113-20f4-4c29-954d-8775d3ed49b9", "company_id": "bed589c5-cf2f-4e2d-9917-1157fe6a4a88", "compliance_score": 100}	2026-04-08 11:26:31.217577+02
c20e26fc-ae30-4a6f-abd8-28dcbeca23d3	governance_completed	{"pulse_id": "7ebf8630-f088-48d7-9818-5daff57ff6ba", "company_id": "8a2dedb5-0740-408a-b15f-9bb153e10a73", "compliance_score": 100}	2026-04-10 11:43:58.663964+02
3b3996e8-7abe-48ea-902e-078c7af0e382	incident_created	{"severity": "Low", "company_id": "8a2dedb5-0740-408a-b15f-9bb153e10a73", "created_by": "2b3a49e3-e87d-4616-9ec9-a6a2210632fa", "incident_id": "01728b3f-dbc8-4ad1-a004-7f4729f72a63"}	2026-04-10 11:45:24.451608+02
8e2834f3-544f-4eb4-8e8c-ee95075a5f88	governance_completed	{"pulse_id": "d5efab33-ca9b-40d8-ba75-dcc4ca63e198", "company_id": "8a2dedb5-0740-408a-b15f-9bb153e10a73", "compliance_score": 80}	2026-04-12 09:21:28.431445+02
5be83e3e-d8d0-4317-899a-5367ce3434ae	risk_created	{"risk_id": "e7248694-7708-4004-9938-b46237fa32c6", "severity": "High", "company_id": "8a2dedb5-0740-408a-b15f-9bb153e10a73", "created_by": "3c366064-a351-42b8-a3f4-b2cde53ca74d"}	2026-04-12 09:21:31.351969+02
46fc5136-d1cc-47bb-8bc2-ecea0df5d727	risk_escalated	{"risk_id": "e7248694-7708-4004-9938-b46237fa32c6", "company_id": "8a2dedb5-0740-408a-b15f-9bb153e10a73", "escalated_by": "3c366064-a351-42b8-a3f4-b2cde53ca74d", "escalated_to": "58385554-4fea-4914-9ac1-f79012e88800"}	2026-04-12 09:21:31.455246+02
4e72c160-d400-49e1-8bc0-5368b9bd7945	governance_completed	{"pulse_id": "e56a4e22-68c5-42b5-8795-da9e5f3d6d6d", "company_id": "3d9c2172-ca02-4ebc-91ed-9b5b5f46fec7", "compliance_score": 100}	2026-04-21 05:54:53.267928+02
b2888aec-f58f-4543-809e-a81d45fb3326	signal.created	{"house_id": "6630fe94-52e9-4e63-9e92-8b33552c0121", "pulse_id": "abc6c204-cae5-453e-8933-7f088db0aced", "company_id": "3d9c2172-ca02-4ebc-91ed-9b5b5f46fec7", "risk_domain": ["Behaviour", "Safeguarding"], "signal_type": "Safeguarding"}	2026-04-21 07:10:53.309875+02
e4461273-28b2-46a4-b4e9-d0580055c359	signal.created	{"house_id": "6630fe94-52e9-4e63-9e92-8b33552c0121", "pulse_id": "d576f51f-1f2d-40d7-8380-6762c2c38e07", "company_id": "3d9c2172-ca02-4ebc-91ed-9b5b5f46fec7", "risk_domain": ["Behaviour"], "signal_type": "Safeguarding"}	2026-04-21 07:22:42.368875+02
2106ffe1-25b2-4a46-8a3e-d3c7a3a15b49	signal.created	{"house_id": "6630fe94-52e9-4e63-9e92-8b33552c0121", "pulse_id": "aece7675-1d51-48c3-ad27-18017710e8d7", "company_id": "3d9c2172-ca02-4ebc-91ed-9b5b5f46fec7", "risk_domain": ["Behaviour"], "signal_type": "Safeguarding"}	2026-04-21 07:23:19.19204+02
65e85239-2b73-4cd9-9b6e-6c11b44a48b3	signal.created	{"house_id": "6630fe94-52e9-4e63-9e92-8b33552c0121", "pulse_id": "ef8bc47a-4aa0-449f-9003-fb5fd03d90e6", "company_id": "3d9c2172-ca02-4ebc-91ed-9b5b5f46fec7", "risk_domain": ["Behaviour"], "signal_type": "Safeguarding"}	2026-04-21 07:23:51.20741+02
d0ada9f9-d7ea-42b0-9335-471e0cca9e91	signal.created	{"house_id": "6630fe94-52e9-4e63-9e92-8b33552c0121", "pulse_id": "2da5f969-5219-4de3-a75d-daadc231ed11", "company_id": "3d9c2172-ca02-4ebc-91ed-9b5b5f46fec7", "risk_domain": ["Behaviour"], "signal_type": "Safeguarding"}	2026-04-21 07:24:53.604179+02
1abf54e3-dd0e-4dc8-8396-0f43c1010b8b	signal.created	{"house_id": "6630fe94-52e9-4e63-9e92-8b33552c0121", "pulse_id": "215351bf-39d7-4e1d-a07c-e76018ff7040", "company_id": "3d9c2172-ca02-4ebc-91ed-9b5b5f46fec7", "risk_domain": ["Behaviour"], "signal_type": "Safeguarding"}	2026-04-21 07:25:51.955526+02
c0739f0d-23ca-4f5c-b771-091d366d2a3b	signal.created	{"house_id": "6630fe94-52e9-4e63-9e92-8b33552c0121", "pulse_id": "e39d96fa-488c-4c31-a3ad-46095a726507", "company_id": "3d9c2172-ca02-4ebc-91ed-9b5b5f46fec7", "risk_domain": ["Behaviour"], "signal_type": "Safeguarding"}	2026-04-21 07:26:45.723023+02
ea9f152e-a56b-4db7-98d2-5e8e01f229c4	signal.created	{"house_id": "6630fe94-52e9-4e63-9e92-8b33552c0121", "pulse_id": "25da6ea2-becc-47f6-857c-828d8a01cccd", "company_id": "3d9c2172-ca02-4ebc-91ed-9b5b5f46fec7", "risk_domain": ["Behaviour"], "signal_type": "Safeguarding"}	2026-04-21 07:27:31.631658+02
e40b0605-a777-4254-98fc-27cd18142880	signal.created	{"house_id": "6630fe94-52e9-4e63-9e92-8b33552c0121", "pulse_id": "d627abf0-a6cb-4186-88b4-13c2438367fc", "company_id": "3d9c2172-ca02-4ebc-91ed-9b5b5f46fec7", "risk_domain": ["Behaviour"], "signal_type": "Safeguarding"}	2026-04-21 07:28:14.073893+02
cea99c8b-6536-4690-b4ba-6bb5212275e7	signal.created	{"house_id": "6630fe94-52e9-4e63-9e92-8b33552c0121", "pulse_id": "0ca26786-dc7d-4834-9d66-e7a8cb701d62", "company_id": "3d9c2172-ca02-4ebc-91ed-9b5b5f46fec7", "risk_domain": ["Behaviour"], "signal_type": "Safeguarding"}	2026-04-21 07:31:22.726481+02
d974ad9c-731e-4280-afa7-212a788dbb4f	signal.created	{"house_id": "6630fe94-52e9-4e63-9e92-8b33552c0121", "pulse_id": "05d7521b-6824-4bd5-904a-f63558674f90", "company_id": "3d9c2172-ca02-4ebc-91ed-9b5b5f46fec7", "risk_domain": ["Behaviour"], "signal_type": "Safeguarding"}	2026-04-21 07:31:49.932164+02
6fc79b7d-e0a6-4217-9487-d84145e6cf66	signal.created	{"house_id": "6630fe94-52e9-4e63-9e92-8b33552c0121", "pulse_id": "2cf23899-6671-4852-8602-a5c9ec0b7a90", "company_id": "3d9c2172-ca02-4ebc-91ed-9b5b5f46fec7", "risk_domain": ["Behaviour"], "signal_type": "Observation"}	2026-04-21 07:31:50.519055+02
6c62e67e-9dcd-4687-90c4-17c4ffd89ae0	signal.created	{"house_id": "6630fe94-52e9-4e63-9e92-8b33552c0121", "pulse_id": "ec36d837-eda4-4c33-bbb4-8619cc8bbbe4", "company_id": "3d9c2172-ca02-4ebc-91ed-9b5b5f46fec7", "risk_domain": ["Behaviour"], "signal_type": "Observation"}	2026-04-21 07:31:50.713962+02
02097616-d767-4c79-a821-77285d2dd905	signal.created	{"house_id": "a89b7ef1-d425-464e-9004-5073cb10759e", "pulse_id": "1bb1078b-a97c-4335-b6ff-05f02b61b83a", "company_id": "e7d63923-5a89-4e61-88a6-175857e8837d", "risk_domain": ["Behaviour"], "signal_type": "Concern"}	2026-04-21 12:35:27.376484+02
c1d14b0e-ade6-4db3-8936-5557f61964f5	signal.created	{"house_id": "8a835b50-f27e-4e1d-985b-a380f03504ea", "pulse_id": "67f11abf-1755-4f31-be08-2866fdd44a57", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "risk_domain": ["Behaviour"], "signal_type": "Concern"}	2026-04-21 12:55:32.009921+02
be49a31d-0399-494f-8b41-7ccb1d423fdf	signal.created	{"house_id": "8a835b50-f27e-4e1d-985b-a380f03504ea", "pulse_id": "ef546c57-2a96-4a61-b1c6-b0f128a0cb00", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "risk_domain": ["Behaviour"], "signal_type": "Concern"}	2026-04-21 18:40:49.785507+02
b87e3c44-fce1-467e-8ec8-c37f03659efc	signal.created	{"house_id": "8a835b50-f27e-4e1d-985b-a380f03504ea", "pulse_id": "7b613f89-0c14-4c73-8f71-b7175542e34c", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-21 18:47:02.519215+02
70e7d68c-fe16-4801-babd-26bedcfb7fea	signal.created	{"house_id": "8a835b50-f27e-4e1d-985b-a380f03504ea", "pulse_id": "87d3e094-107e-4cac-9c46-691e5465cea0", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "risk_domain": ["Behaviour"], "signal_type": "Concern"}	2026-04-21 18:56:40.951704+02
56ec4d02-527f-4eb5-a56c-121b364f16b5	signal.created	{"house_id": "8a835b50-f27e-4e1d-985b-a380f03504ea", "pulse_id": "e543a8ed-1f19-47f5-aa6e-2d289e5b75ae", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "risk_domain": ["Governance"], "signal_type": "Observation"}	2026-04-21 19:02:02.966872+02
ce53bb47-91d7-4514-92c7-7034244e0e66	signal.created	{"house_id": "8a835b50-f27e-4e1d-985b-a380f03504ea", "pulse_id": "0b0e79f2-b8fd-4e90-8b91-852f89d59e5c", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "risk_domain": ["Governance"], "signal_type": "Observation"}	2026-04-21 19:04:12.564792+02
a8406f7a-d8b0-472a-badd-1a80fe9b1c4f	signal.created	{"house_id": "8a835b50-f27e-4e1d-985b-a380f03504ea", "pulse_id": "df486c02-0c56-4b10-8fe2-63d05d3350ce", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "risk_domain": ["Staffing", "Physical"], "signal_type": "Concern"}	2026-04-21 19:13:00.360873+02
1874dadc-d002-4970-9d15-3e4ab293c219	signal.created	{"house_id": "8a835b50-f27e-4e1d-985b-a380f03504ea", "pulse_id": "6c978017-621d-4446-b708-ce60dd8be6a5", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-21 19:22:55.317241+02
2a303a80-b4a8-4026-9b3c-7d4cf0758967	signal.created	{"house_id": "8a835b50-f27e-4e1d-985b-a380f03504ea", "pulse_id": "b6bcda3c-af09-4f76-a76c-0f233d2a0fbb", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-21 19:24:33.91139+02
0f7e5afd-e033-4726-a7a0-0431cc65b030	governance_concern	{"message": "URGENT: Safeguarding signal received for Rose House during RM absence. Action Required within 4h.", "user_id": "26551ecb-8350-4f00-881d-5d8da5339281", "pulse_id": "2fa1d3c9-53f9-4920-8b61-064aacb09aea", "company_id": "55f62f95-ad49-46ad-9aad-825635877337"}	2026-04-21 19:40:51.924271+02
9487d5ea-9a23-44bd-af00-b6e02dbd754d	signal.created	{"house_id": "8a835b50-f27e-4e1d-985b-a380f03504ea", "pulse_id": "2fa1d3c9-53f9-4920-8b61-064aacb09aea", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "risk_domain": ["Staffing"], "signal_type": "Safeguarding"}	2026-04-21 19:40:51.938245+02
3683d650-6dfc-4c72-a44f-4e1d5c347e2b	signal.created	{"house_id": "8a835b50-f27e-4e1d-985b-a380f03504ea", "pulse_id": "48b5f7f3-9085-497e-90b0-0827600ef2f8", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "risk_domain": ["Staffing"], "signal_type": "Observation"}	2026-04-21 19:49:57.676892+02
002118d3-1ebb-4b36-9a75-dba9ee42d113	risk_created	{"risk_id": "f0726953-b3d0-463e-9381-86fb60346f9d", "severity": "High", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "created_by": "8ea66d8a-c9b3-438d-93ed-e60c742c3ba7"}	2026-04-21 20:08:55.910771+02
480df34a-ee60-471c-9c8a-fa737493cdd2	risk_created	{"risk_id": "b72e151e-e4d6-4be6-983a-f2dde78d912a", "severity": "High", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "created_by": "8ea66d8a-c9b3-438d-93ed-e60c742c3ba7"}	2026-04-21 20:10:00.529664+02
80538568-76c9-4928-896d-805e9b596d3e	risk_created	{"risk_id": "df071864-4482-4c2e-a01e-e1e598159b1a", "severity": "High", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "created_by": "8ea66d8a-c9b3-438d-93ed-e60c742c3ba7"}	2026-04-21 20:10:52.371+02
8025bbea-6b23-42f4-a9f6-4ef6cef596ac	risk_created	{"risk_id": "0e4d001c-2fea-4e71-8ae7-d82a90aac520", "severity": "High", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "created_by": "8ea66d8a-c9b3-438d-93ed-e60c742c3ba7"}	2026-04-21 20:11:49.849942+02
fd8a0484-8562-4ae3-b519-7a5004c0b4fc	risk_created	{"risk_id": "a0928633-7f13-4477-be3c-47f82c7b728c", "severity": "Low", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "created_by": "8ea66d8a-c9b3-438d-93ed-e60c742c3ba7"}	2026-04-22 09:49:23.452417+02
fa04000b-0fc0-4569-b0fe-25dc103b1aa5	risk_created	{"risk_id": "0b1ac4cc-2329-4a4e-8926-00a9a7f9f684", "severity": "High", "company_id": "55f62f95-ad49-46ad-9aad-825635877337", "created_by": "8ea66d8a-c9b3-438d-93ed-e60c742c3ba7"}	2026-04-22 09:50:57.186948+02
c7fb5c69-b0bd-42d4-a3c8-194721721c80	signal.created	{"house_id": "e7c722a5-183e-4fa0-a0c6-f7f6bdfcaa09", "pulse_id": "44001ce7-b061-491e-b8f2-0845b8c60057", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Behaviour"], "signal_type": "Concern"}	2026-04-23 14:10:11.349173+02
a03564df-80ad-4372-95b0-ec765b1b4003	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "eeaa281a-84a8-4b96-ada8-69774d776ac0", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Behaviour"], "signal_type": "Concern"}	2026-04-23 14:11:41.231069+02
6d25321e-7eb7-45c5-94c6-fb7349e07fe4	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "3f0df1d1-b738-4d73-9949-28ae2489d508", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-23 14:13:04.033631+02
121b8cb1-2af1-4f90-b7ca-e2b1969b7cad	governance_concern	{"message": "URGENT: Safeguarding signal received for Maple Court during RM absence. Action Required within 4h.", "user_id": "aebf3203-6ee8-47a5-9cc3-00842ddd4b4a", "pulse_id": "43fa96aa-6247-4876-898c-7be755d2e4de", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d"}	2026-04-23 14:14:30.315156+02
1cfb32b8-d808-4099-8aec-88dac5f3b48b	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "43fa96aa-6247-4876-898c-7be755d2e4de", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Behaviour"], "signal_type": "Safeguarding"}	2026-04-23 14:14:30.342233+02
27cab814-4741-4d2b-95c0-df7da18b4be6	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "3f338221-8307-4014-a3f6-ede73379c710", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Medication"], "signal_type": "Concern"}	2026-04-23 14:15:49.778547+02
fba6e14b-69c6-401d-91b7-d0241d76002d	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "841bf544-91f3-4a97-89f2-b46b4b1384ff", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Medication"], "signal_type": "Incident"}	2026-04-23 14:16:57.981184+02
7b5c63d5-3d29-46cb-99a4-4e41b7af1c51	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "1ae38a65-2f3d-48d4-97e2-b1a3a4bfc731", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Safeguarding"], "signal_type": "Concern"}	2026-04-23 14:18:08.473816+02
68566cef-e961-488c-91bf-1161063df4c3	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "c705dd65-62c8-4191-8e04-cd4d5b6fc420", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Safeguarding"], "signal_type": "Incident"}	2026-04-23 14:19:15.670124+02
03e837fd-4dee-4559-8b0a-dea3d063462c	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "2ff76c0d-6834-4131-952e-747f4d2837a3", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Mental"], "signal_type": "Concern"}	2026-04-23 14:20:26.343492+02
7a5bbf22-a28e-4811-b9df-eabb4090c0ce	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "b64aba47-0f70-4700-87f5-1da689c147b9", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Mental"], "signal_type": "Incident"}	2026-04-23 14:21:34.402313+02
005ded3c-305d-4b30-a90b-6ad0cb1308f6	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "8bca47c4-5f0f-4f73-91e3-7e7a8b7076f6", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Physical"], "signal_type": "Concern"}	2026-04-23 14:23:12.124389+02
5a18e022-ed14-4dce-ac6f-09d9a3dd35e3	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "53331725-fe8d-4a59-b35e-9b708e423a4a", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Safeguarding"], "signal_type": "Incident"}	2026-04-23 14:24:26.483622+02
abe87774-bf35-4121-9319-c23cec98efef	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "7ff55ba2-1362-4f2c-8ee3-7055646a8b96", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Physical"], "signal_type": "Concern"}	2026-04-23 14:25:38.614976+02
51d61aea-ad15-4fb5-aad4-197cabe0da0e	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "b56b809b-28ff-41cd-91ef-78a5789d7938", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Physical"], "signal_type": "Incident"}	2026-04-23 14:26:46.654102+02
875593e2-319e-43ce-a83f-768a8f23e52d	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "41dff7e1-c8e8-4b9e-a7ae-e08981394f34", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-23 14:28:01.126295+02
01f5bb31-52be-495c-a8c9-5539a4ab1048	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "44c05357-a560-4ec6-80c0-81fbc1b63b51", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Staffing"], "signal_type": "Incident"}	2026-04-23 14:29:10.055859+02
9e009eb4-d2c0-4cf8-a512-527373369260	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "50771d59-fb7e-432f-ae67-4df87718ff9e", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Environment"], "signal_type": "Concern"}	2026-04-23 14:30:20.083742+02
19294ef2-d304-4705-be5b-c731c4c30acf	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "802e1c5a-ca43-4564-9f4c-bc5cf7400a1b", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Mental"], "signal_type": "Incident"}	2026-04-23 14:31:32.212547+02
6d568d57-fcf5-4fa1-9d83-ee8ea3939d9c	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "84e69766-1565-4d52-8205-dad0ba96e823", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Behaviour"], "signal_type": "Concern"}	2026-04-23 14:32:40.018826+02
ea6d7116-56b7-4211-ba65-f318ba2a0765	signal.created	{"house_id": "9bc36473-6e96-4e24-8e45-de0d5dfb8157", "pulse_id": "c6330053-0416-4c4a-8e26-ee930d34258e", "company_id": "91427452-0161-4fbf-9566-5ce3b81cdb6d", "risk_domain": ["Environment"], "signal_type": "Concern"}	2026-04-23 14:33:45.754552+02
5798c627-0f5f-417d-904f-88703e478b5c	signal.created	{"house_id": "38ba95e5-81a2-409b-992e-862b3f31e889", "pulse_id": "da635a1a-2a9f-4109-beb1-d1d168a652f9", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-24 11:41:55.082346+02
c9b18382-37a3-4a80-8459-04a97714de2a	signal.created	{"house_id": "38ba95e5-81a2-409b-992e-862b3f31e889", "pulse_id": "03c5002b-864f-4f8f-ba9d-85ed3dbdff67", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-24 11:43:34.031416+02
0ddc3f63-497b-4e24-9955-6a4b72cbaa97	signal.created	{"house_id": "38ba95e5-81a2-409b-992e-862b3f31e889", "pulse_id": "d2d89271-62d5-44b4-8828-9c799f4d3f3d", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-24 11:45:12.077467+02
fdad9948-ed72-4138-bdce-f40671c2e958	signal.created	{"house_id": "38ba95e5-81a2-409b-992e-862b3f31e889", "pulse_id": "4982f084-8d50-404f-8c52-2f2069405891", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-24 11:51:08.580816+02
d6039820-9dcf-4e26-a15d-9fb881d9b083	signal.created	{"house_id": "38ba95e5-81a2-409b-992e-862b3f31e889", "pulse_id": "abb65664-7376-4303-969c-96ac2584b98d", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-24 11:51:49.078179+02
7a213b32-369f-4243-b567-6c880f72c6c1	signal.created	{"house_id": "38ba95e5-81a2-409b-992e-862b3f31e889", "pulse_id": "a4fb53a0-8af5-481e-a79a-f509e12df069", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-24 11:52:30.441511+02
2693d30d-c091-44d9-bfc1-908089947190	signal.created	{"house_id": "38ba95e5-81a2-409b-992e-862b3f31e889", "pulse_id": "b80310b1-9868-42bb-b8fa-ce61465e4c9d", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-24 11:53:12.303578+02
fd2084e4-cf46-439f-abf5-31cfc91d447b	signal.created	{"house_id": "38ba95e5-81a2-409b-992e-862b3f31e889", "pulse_id": "38e090c1-7e48-44e3-a223-63f6ae3bd512", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-24 12:12:21.38772+02
35005c0f-049c-4fe2-88e7-990b3dbbadff	signal.created	{"house_id": "38ba95e5-81a2-409b-992e-862b3f31e889", "pulse_id": "0e68c514-26db-4dd4-ba9b-17904b2e568e", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-24 12:14:16.92661+02
6a828eda-8026-42e1-a090-048e64bc3760	signal.created	{"house_id": "38ba95e5-81a2-409b-992e-862b3f31e889", "pulse_id": "dfc00017-baba-463e-8a83-a8174753b904", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-24 12:15:46.708652+02
51eab994-57fa-48a0-afed-d7c261c855b9	signal.created	{"house_id": "38ba95e5-81a2-409b-992e-862b3f31e889", "pulse_id": "3a0a403e-fc0d-4d06-8237-b0756ffe9dd7", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112", "risk_domain": ["Medication"], "signal_type": "Incident"}	2026-04-24 12:17:20.555298+02
b7fe35f7-8e05-4e01-ae53-3bfce3178b63	signal.created	{"house_id": "38ba95e5-81a2-409b-992e-862b3f31e889", "pulse_id": "79a7e56f-580d-4ab5-a976-7151a90c083c", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112", "risk_domain": ["Staffing", "Safeguarding"], "signal_type": "Incident"}	2026-04-24 17:32:06.99153+02
fb0b2f8b-0f0a-4727-a291-35f1a550971c	incident_created	{"severity": "Low", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112", "created_by": "51f3afcc-4c64-48b9-b30c-c4565de0bfda", "incident_id": "fcd0c65f-b0d1-47b9-9d7d-d6863ce7b502"}	2026-04-24 17:35:31.123295+02
f4add3f0-7022-4571-a046-08578a92a5ef	report_requested	{"user_id": "8dec8af3-5a67-4f68-8fc4-a565da063520", "report_id": "878d51e7-01fd-46e1-aa09-42c1f536591e", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112"}	2026-04-24 17:39:38.677422+02
b424c1f0-0677-419d-bbdf-7ff8cc8bb6e7	report_requested	{"user_id": "8dec8af3-5a67-4f68-8fc4-a565da063520", "report_id": "bb3f814b-2220-46c1-ba00-d94283ee4788", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112"}	2026-04-24 17:54:11.295135+02
6d396205-d621-4e85-95c4-b0c5818f9f7d	report_requested	{"user_id": "990dea81-a652-4aa2-b6c5-3292af5dfa55", "report_id": "e867e7b6-f738-4c7b-bbf7-581216cfe66d", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112"}	2026-04-24 19:07:53.141765+02
c3bff018-87cd-4714-b695-5df78bb47524	report_completed	{"type": "organizational_monthly", "file_url": "/reports/e867e7b6-f738-4c7b-bbf7-581216cfe66d.pdf", "report_id": "e867e7b6-f738-4c7b-bbf7-581216cfe66d", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112"}	2026-04-24 19:07:53.279147+02
7b3caf18-942c-4209-89c6-e457c24ba64c	signal.created	{"house_id": "38ba95e5-81a2-409b-992e-862b3f31e889", "pulse_id": "266c069a-ef6f-4462-878f-08ee876e0ebc", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112", "risk_domain": ["Physical"], "signal_type": "Incident"}	2026-04-27 12:34:59.87084+02
5a7c4ea5-3218-43fa-9b58-3d31343aa5f2	signal.created	{"house_id": "38ba95e5-81a2-409b-992e-862b3f31e889", "pulse_id": "3a62cf1f-2712-4d31-b8d7-f90cc6531a88", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-27 20:07:15.911586+02
590c10e3-251c-4911-b68b-dfca077a9443	signal.created	{"house_id": "38ba95e5-81a2-409b-992e-862b3f31e889", "pulse_id": "fa7d09e7-2ac2-4a84-97c8-a7f16e04f97e", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112", "risk_domain": ["Behaviour"], "signal_type": "Environment"}	2026-04-27 20:20:21.465164+02
85bc6a14-0720-418f-91a3-f6b00be9547e	signal.created	{"house_id": "e62719df-1505-4ddf-bd6e-f00974dc0e08", "pulse_id": "788fd468-593a-4940-928a-b1b82452d874", "company_id": "e9ec1d9e-56e5-4ec4-b2ef-9ae35452a40c", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-28 02:45:57.711091+02
d0072787-4f2b-499b-9c7d-f15a035a6402	signal.created	{"house_id": "e62719df-1505-4ddf-bd6e-f00974dc0e08", "pulse_id": "37e2bc82-7586-41e0-8750-29fb72087c6f", "company_id": "e9ec1d9e-56e5-4ec4-b2ef-9ae35452a40c", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-28 02:46:47.665312+02
d8ef1a67-be94-4dc8-8a1f-61e790f182a4	signal.created	{"house_id": "e62719df-1505-4ddf-bd6e-f00974dc0e08", "pulse_id": "8dd1e8a0-803e-4e58-8c68-5e39e8abbe28", "company_id": "e9ec1d9e-56e5-4ec4-b2ef-9ae35452a40c", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-28 02:50:25.777453+02
e1dc59e5-38ca-4ed0-883f-7f8e20fe184c	report_requested	{"user_id": "4f02065e-dbd5-4448-894e-c0232f8e92a5", "report_id": "b8906cfb-f397-4297-8f59-356f444e9e5e", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112"}	2026-04-29 10:43:28.911722+02
f0b42b33-c689-4ffb-b741-b6157b8f9042	report_completed	{"type": "risk_summary", "file_url": "/reports/b8906cfb-f397-4297-8f59-356f444e9e5e.pdf", "report_id": "b8906cfb-f397-4297-8f59-356f444e9e5e", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112"}	2026-04-29 10:43:29.006424+02
11782126-52e2-403c-9605-959360d93f3d	report_requested	{"user_id": "4f02065e-dbd5-4448-894e-c0232f8e92a5", "report_id": "be84ad5a-1703-4a2a-b3f1-6572954ffe68", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112"}	2026-04-29 10:56:51.91487+02
4ea2168f-d832-45e1-97a8-b315e2ebec54	report_requested	{"user_id": "4f02065e-dbd5-4448-894e-c0232f8e92a5", "report_id": "e806fd40-a641-45c2-9e24-f8cbcd3b9714", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112"}	2026-04-29 11:04:22.441779+02
45944631-4617-4dab-bf4b-7457641a147d	report_requested	{"user_id": "4f02065e-dbd5-4448-894e-c0232f8e92a5", "report_id": "fea3c2f5-cb72-4689-b150-06f68a0b782e", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112"}	2026-04-29 11:37:01.839431+02
27037b36-4fe7-48b4-b085-becee7cf088e	report_completed	{"type": "governance_compliance", "file_url": "/reports/fea3c2f5-cb72-4689-b150-06f68a0b782e.pdf", "report_id": "fea3c2f5-cb72-4689-b150-06f68a0b782e", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112"}	2026-04-29 11:37:01.875119+02
c231f517-c380-4ce6-a10b-37618764469f	report_requested	{"user_id": "4f02065e-dbd5-4448-894e-c0232f8e92a5", "report_id": "bdc2c6be-d58a-4339-8854-8f2164b4387b", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112"}	2026-04-29 11:37:02.306034+02
3ff547fe-d3c9-456a-b354-1941ed0ed9f0	report_completed	{"type": "governance_compliance", "file_url": "/reports/bdc2c6be-d58a-4339-8854-8f2164b4387b.pdf", "report_id": "bdc2c6be-d58a-4339-8854-8f2164b4387b", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112"}	2026-04-29 11:37:02.322894+02
cd80e67e-6db5-468a-86d2-a45ca716edd9	report_requested	{"user_id": "4f02065e-dbd5-4448-894e-c0232f8e92a5", "report_id": "f0ad2eee-5ee0-4503-a804-63cfe98da584", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112"}	2026-04-29 11:37:06.245991+02
4308d878-a65d-4fbd-8142-167069c08e72	report_completed	{"type": "custom", "file_url": "/reports/f0ad2eee-5ee0-4503-a804-63cfe98da584.pdf", "report_id": "f0ad2eee-5ee0-4503-a804-63cfe98da584", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112"}	2026-04-29 11:37:06.260481+02
8b6638f4-832c-442e-8bd9-7459113c42ad	report_requested	{"user_id": "4f02065e-dbd5-4448-894e-c0232f8e92a5", "report_id": "904e29ac-b2cd-44f8-b0d6-e02d2566bad0", "company_id": "c38ba336-3dd3-4f56-a385-539765a4e112"}	2026-04-29 11:37:15.257575+02
f15599d3-db41-4d43-9162-c194f508d2b7	signal.created	{"house_id": "fa1edc57-e55e-4867-b873-3067cbdc90c5", "pulse_id": "25091d70-5da6-4bea-9b31-7ae32ecb84b1", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-30 07:53:37.296392+02
7630ce67-50c7-4f12-971b-219edf6f0a8e	signal.created	{"house_id": "81e3d5e7-d7c4-4779-8ffd-3e0434ac1b83", "pulse_id": "c5b09148-fba5-4472-ad54-2217ddb2fde8", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Medication"], "signal_type": "Concern"}	2026-04-30 07:55:01.847307+02
cc3e38c1-56d7-4af9-8cad-ccd6e27d4ea1	signal.created	{"house_id": "fa1edc57-e55e-4867-b873-3067cbdc90c5", "pulse_id": "eb826238-27d4-484f-8c59-fa67d3b84aeb", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Physical"], "signal_type": "Incident"}	2026-04-30 07:56:08.068415+02
50f12316-2774-45e0-b8b8-be343aa42a13	signal.created	{"house_id": "fa1edc57-e55e-4867-b873-3067cbdc90c5", "pulse_id": "9df483a2-8244-4cfc-aa0d-b6ea34deeffb", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Behaviour"], "signal_type": "Observation"}	2026-04-30 07:57:10.247619+02
d8ae6183-27a1-429c-b4cd-88a4e863d94a	signal.created	{"house_id": "fa1edc57-e55e-4867-b873-3067cbdc90c5", "pulse_id": "dc6a92ae-4004-4285-b2e7-8374b4d0013d", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Mental"], "signal_type": "Concern"}	2026-04-30 07:58:08.93661+02
dca0878a-6f36-4f67-ab82-3138344d4a6c	signal.created	{"house_id": "fa1edc57-e55e-4867-b873-3067cbdc90c5", "pulse_id": "8213ee1e-e6ae-41bb-9826-778203b14b8a", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Behaviour"], "signal_type": "Incident"}	2026-04-30 07:59:07.942019+02
73703efc-ec9f-4ee1-bde8-d5af015760f6	signal.created	{"house_id": "fa1edc57-e55e-4867-b873-3067cbdc90c5", "pulse_id": "c2a80cba-470c-49e0-bef7-ae4265c59fa0", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Behaviour"], "signal_type": "Staffing"}	2026-04-30 08:00:10.417337+02
f770ef0c-0c9d-45be-8764-5abaac4a1e29	signal.created	{"house_id": "fa1edc57-e55e-4867-b873-3067cbdc90c5", "pulse_id": "229c8c86-d694-4c2f-aab8-b182ea74ec8b", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Medication"], "signal_type": "Concern"}	2026-04-30 08:01:13.805243+02
a82cb7c9-c98d-42d5-a848-53300009b131	signal.created	{"house_id": "fa1edc57-e55e-4867-b873-3067cbdc90c5", "pulse_id": "4c6f9bb5-031e-4770-a1e3-0546b91e30c3", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Safeguarding"], "signal_type": "Incident"}	2026-04-30 08:02:09.341515+02
6778234b-c86e-467a-9329-79d29e8691a4	signal.created	{"house_id": "fa1edc57-e55e-4867-b873-3067cbdc90c5", "pulse_id": "28ac8f06-0d1f-408d-b39a-0ec1a3fefdb4", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Behaviour"], "signal_type": "Observation"}	2026-04-30 08:03:02.104892+02
925bf36c-c261-4ba5-8ba8-827db1097363	signal.created	{"house_id": "8d467149-34dd-4d29-8680-27d9558ac48f", "pulse_id": "dcca862d-e324-4657-8cd2-edafd44def8a", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Staffing"], "signal_type": "Observation"}	2026-04-30 08:07:03.086732+02
cfc2c72b-ba73-4103-8d8e-a7990a96f5de	signal.created	{"house_id": "8d467149-34dd-4d29-8680-27d9558ac48f", "pulse_id": "dc8b787e-6b61-4bf2-b25d-cfc5ef5aa094", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Environment"], "signal_type": "Concern"}	2026-04-30 08:08:19.883759+02
8e5912b3-1d77-44f0-9cb6-fa5ce2a84320	signal.created	{"house_id": "8d467149-34dd-4d29-8680-27d9558ac48f", "pulse_id": "5d2850a7-d4ef-4374-ac87-0454f26d05ea", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Safeguarding"], "signal_type": "Incident"}	2026-04-30 08:09:20.691191+02
8c566ca9-fb37-4305-90d8-774c000245af	signal.created	{"house_id": "8d467149-34dd-4d29-8680-27d9558ac48f", "pulse_id": "d0a13af2-34f4-4218-9aca-72722b9eb0db", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Physical"], "signal_type": "Observation"}	2026-04-30 08:10:15.155784+02
8c2a358b-1eb4-4c13-8403-4d4b21669824	signal.created	{"house_id": "8d467149-34dd-4d29-8680-27d9558ac48f", "pulse_id": "4fa92f2c-fc32-4aa3-9f6a-d69a4145b551", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Governance", "Safeguarding"], "signal_type": "Concern"}	2026-04-30 08:12:05.724932+02
f30fb16c-90c6-470b-a075-feabd5c4030a	signal.created	{"house_id": "8d467149-34dd-4d29-8680-27d9558ac48f", "pulse_id": "69967825-f920-4d0d-82ef-8703742c400f", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Physical"], "signal_type": "Incident"}	2026-04-30 08:12:56.850001+02
20022891-ea58-4176-bbfd-b5b4ab9f0629	signal.created	{"house_id": "8d467149-34dd-4d29-8680-27d9558ac48f", "pulse_id": "3c90af7e-7092-41ea-943c-b825b7ea917f", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Physical"], "signal_type": "Medication"}	2026-04-30 08:13:56.51038+02
bd5cbc2e-e755-4622-8b1a-e3e4cbd0715b	signal.created	{"house_id": "8d467149-34dd-4d29-8680-27d9558ac48f", "pulse_id": "da4f5d8d-c4c6-42f7-a759-58757393ba8b", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Staffing"], "signal_type": "Concern"}	2026-04-30 08:15:45.665721+02
7c1b1aae-cd51-4553-8cd1-348f142f2d38	signal.created	{"house_id": "8d467149-34dd-4d29-8680-27d9558ac48f", "pulse_id": "ac138b29-7ae6-42a2-963a-6610deec9ead", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Staffing", "Behaviour"], "signal_type": "Incident"}	2026-04-30 08:16:36.256717+02
87fb856e-3789-485b-8e25-bd14ca606583	governance_concern	{"message": "URGENT: Safeguarding signal received for Oak Lodge during RM absence. Action Required within 4h.", "user_id": "0ee6e1c2-0b2b-45ec-b991-52e9d1ea39c2", "pulse_id": "3af25546-eea8-4c27-b9cb-f456374ce96a", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449"}	2026-04-30 08:18:31.896034+02
adf4ef43-bb04-4350-a6d1-745a93156017	signal.created	{"house_id": "8d467149-34dd-4d29-8680-27d9558ac48f", "pulse_id": "3af25546-eea8-4c27-b9cb-f456374ce96a", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Behaviour"], "signal_type": "Safeguarding"}	2026-04-30 08:18:31.907543+02
74441da6-96b4-4324-a525-b16117edb9ec	governance_concern	{"message": "URGENT: Safeguarding signal received for Oak Lodge during RM absence. Action Required within 4h.", "user_id": "0ee6e1c2-0b2b-45ec-b991-52e9d1ea39c2", "pulse_id": "0221bcd6-622f-4fee-8172-6f927c553dec", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449"}	2026-04-30 08:21:06.188553+02
dd6fc004-4d48-4717-ab51-f0f33493ae73	signal.created	{"house_id": "8d467149-34dd-4d29-8680-27d9558ac48f", "pulse_id": "0221bcd6-622f-4fee-8172-6f927c553dec", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Governance", "Safeguarding"], "signal_type": "Safeguarding"}	2026-04-30 08:21:06.198018+02
c2328e55-e0a9-4a7e-bfcb-5d084700ce52	signal.created	{"house_id": "8d467149-34dd-4d29-8680-27d9558ac48f", "pulse_id": "3cb3ad41-52e5-4eec-a29a-efecffd2256c", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449", "risk_domain": ["Behaviour", "Medication"], "signal_type": "Incident"}	2026-04-30 08:31:03.30689+02
68d7b1be-536f-4c46-b0c3-a3aedb65b54d	report_requested	{"user_id": "cd9e18db-e6e9-4781-b505-4c5b8f12908a", "report_id": "c08976b2-cc9b-4e83-ab36-daee3d45b557", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449"}	2026-04-30 08:57:17.863225+02
61bb66c7-1597-4196-bebe-154f4fe3b792	report_completed	{"type": "cross_site_summary", "file_url": "/reports/c08976b2-cc9b-4e83-ab36-daee3d45b557.pdf", "report_id": "c08976b2-cc9b-4e83-ab36-daee3d45b557", "company_id": "0eb08834-adf6-4c75-8ade-bde62a9ca449"}	2026-04-30 08:57:17.932985+02
77057a55-4c0d-432a-b616-54d0f2ad9e7c	risk_created	{"risk_id": "b394e4ed-44a4-46cd-9078-486563766a8e", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-01 10:28:41.432926+02
c42ac7cf-a406-4382-81fe-4e9e808169a1	signal.created	{"house_id": "11111111-2222-3333-4444-555555555555", "pulse_id": "6764e869-dba8-4d7c-928c-39cf9d9681b4", "company_id": "11111111-1111-1111-1111-111111111111", "risk_domain": ["Behaviour"], "signal_type": "Observation"}	2026-05-01 19:42:43.016662+02
7ef1e2c0-ed40-4e4d-beb3-3f2d43995bf8	incident_created	{"severity": "Medium", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111101", "incident_id": "bfbe07ba-9a72-44ee-a25f-ae3e09c2aab5"}	2026-05-01 19:44:41.547944+02
2fff6147-3f04-4ea0-bb9e-a416714bf1a2	risk_created	{"risk_id": "3d99b99c-b400-4d5e-ad31-cbf9ab6c72b9", "severity": "High", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-01 19:48:01.142746+02
aca691f4-ae3a-47f1-802d-eed94c287085	risk_escalated	{"risk_id": "3d99b99c-b400-4d5e-ad31-cbf9ab6c72b9", "company_id": "11111111-1111-1111-1111-111111111111", "escalated_by": "11111111-1111-1111-1111-111111111102", "escalated_to": "11111111-1111-1111-1111-111111111104"}	2026-05-01 19:48:01.179684+02
c784b1a6-8f6d-495d-91f0-279593a7da8a	report_requested	{"user_id": "11111111-1111-1111-1111-111111111102", "report_id": "c856efca-38b2-4d80-86f4-78ae50edb95b", "company_id": "11111111-1111-1111-1111-111111111111"}	2026-05-01 19:56:53.126154+02
b336e271-d596-4024-bf1a-d7000bddccc3	risk_created	{"risk_id": "9f36e7af-bd1d-4807-8fb3-68da88c521a9", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-01 19:58:36.458902+02
0edb0913-a1f3-4d72-9409-ed464e02a330	risk_created	{"risk_id": "e2ec081c-ab1f-47c4-8b70-9cd21578747a", "severity": "High", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-01 20:12:47.095725+02
de377b88-0257-447f-a714-ef84fca0a9ef	risk_escalated	{"risk_id": "e2ec081c-ab1f-47c4-8b70-9cd21578747a", "company_id": "11111111-1111-1111-1111-111111111111", "escalated_by": "11111111-1111-1111-1111-111111111102", "escalated_to": "11111111-1111-1111-1111-111111111104"}	2026-05-01 20:12:47.132856+02
cce41c5f-3d99-4592-beaf-29cfab2d38a9	escalation_resolved	{"company_id": "11111111-1111-1111-1111-111111111111", "resolved_by": "11111111-1111-1111-1111-111111111103", "escalation_id": "7fe89c2f-8c15-4eea-89a2-d36b5820872c"}	2026-05-01 21:56:37.673948+02
383b443a-c1df-4433-8c5a-e8b44ae691d9	risk_created	{"risk_id": "f185fca9-c52c-4417-a24a-dab864120869", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:22:26.633042+02
e3ea61ab-22e6-49b6-aa19-1453b35b1084	incident_created	{"severity": "Low", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102", "incident_id": "d4e06936-1e0e-4453-b425-b5328c3159b9"}	2026-05-02 02:25:30.226732+02
dcf6f967-bb5e-4881-b1a5-b796443d4f3c	risk_created	{"risk_id": "1bcffc9a-b565-4c26-8215-10424e3dbf44", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:30:26.630668+02
0182104e-08db-46fa-8fdb-7de25a81c09b	risk_created	{"risk_id": "4c5fae47-aa50-4331-acc3-102ca0eecdef", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:31:24.642323+02
103eefef-9d7a-46b5-86ee-a1879cb05d07	risk_created	{"risk_id": "9de14391-0e99-4f03-b2c1-5f6a5f3c2dbc", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:31:53.684992+02
840bd656-f637-4367-83c1-10618c9d8d88	risk_created	{"risk_id": "54078b25-a675-4136-9a6e-efcd33590bce", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:32:39.506499+02
52b05eac-1b90-4ba4-b337-9b972e004694	risk_created	{"risk_id": "4cb0c29c-925a-45ab-8864-927fd0bf0b98", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:34:09.701048+02
bfc21b55-ad1a-49bb-9ae5-d54a5f7f4776	risk_created	{"risk_id": "27ef1bf8-af38-4de7-a840-8b469d67279d", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:34:56.949761+02
d32ae716-dbd5-4f33-9b3b-c6b5bcf1cd79	risk_created	{"risk_id": "3b0502a6-d8c9-4feb-9936-eb25b6c29ca1", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:35:55.951524+02
caeadc03-f871-49f4-b00e-d058c383827b	risk_created	{"risk_id": "909030a5-3b42-471b-9d2b-adcd04665977", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:36:50.025108+02
238d01cf-e8ad-4b28-b7f6-e8d6f1f65116	risk_created	{"risk_id": "cf95740e-3446-4774-914c-0083ad085609", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:37:45.707548+02
23f4e6d2-80da-4866-935d-98381e101352	risk_created	{"risk_id": "1997036f-850e-44b5-b524-92c40cccc8f9", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:38:37.896428+02
9c03a704-fd1d-429a-b2c0-a40d01d3d05f	risk_created	{"risk_id": "3c97931a-3f3c-4091-8e1d-d7ca5b951750", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:39:39.175641+02
a8f1eb81-db10-4f0f-8685-565e936e155a	risk_created	{"risk_id": "207ff2ed-8539-4254-ae8b-74d45db40ace", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:40:26.686549+02
a45b677b-c267-48c3-9aa6-17a3b98c4651	risk_created	{"risk_id": "fa5e0c3a-1018-43db-b5f3-e2a2abca914a", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:41:07.171013+02
ac1080e1-a8ec-4f2e-a852-b972b259c350	risk_created	{"risk_id": "acf414f6-1c7c-49bd-8c7b-292354c87fbf", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:41:39.661728+02
e7e2345a-092d-49f0-b597-65c26ecfc5de	risk_created	{"risk_id": "476e0582-70d8-4273-80c0-f2a4d84bba08", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:42:26.840628+02
aa3eef80-65fa-4155-8e20-95c633ae04d3	risk_created	{"risk_id": "428d2545-e317-410f-a3ab-5809f2ff3d37", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:42:58.662961+02
ed5c31d3-0e98-42b6-bc56-6968133fb7b0	risk_created	{"risk_id": "151aba76-82aa-49db-9cb7-343acf491979", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:43:36.61496+02
801b07be-9906-4077-b4be-fc96896b83d2	risk_created	{"risk_id": "0139922d-3b4b-47b7-8cf8-cd736a51a726", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:44:09.614554+02
4d00cbad-79b1-49b6-b6bf-9cb38a45bcdd	risk_created	{"risk_id": "e11fd083-0417-43b8-9cd8-153ec483b543", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:44:49.968085+02
7504c4c4-922a-4e81-a980-591b4e0aab3e	risk_created	{"risk_id": "58433ab1-5675-4cb4-8e2f-618b198ed343", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:48:21.094955+02
7bfd5f88-a528-4273-9e48-171c6859abac	risk_created	{"risk_id": "7610baa5-0d0d-4cf8-9d6f-9b465013a7ba", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:49:09.594172+02
6094a098-b571-436f-ae3a-1f64f912aefc	risk_created	{"risk_id": "d70a0afe-531e-4c3e-8ca0-21b8aa575109", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:49:45.272559+02
3005c5f5-a374-4889-90f1-6b47f17690ce	risk_created	{"risk_id": "c5972ce4-7457-40c9-878a-a02db0469d93", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:50:51.119846+02
f0589cb6-f0ca-41b7-81c2-269658b1a706	risk_created	{"risk_id": "543cde54-336a-45aa-b597-e1c6ae99a4eb", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:51:31.851979+02
45e0365f-e48b-458a-ae48-5325a41a00f6	risk_created	{"risk_id": "ee250b63-0236-49d6-be63-a04c33faf7f6", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:53:11.479719+02
ee432eb5-0b3b-4e41-8488-051106753621	risk_created	{"risk_id": "2e444fd2-1a2d-4c5a-abf6-4cce2b5830a9", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 02:54:00.177931+02
0995fe10-b5d2-455e-a2e2-91bee837edcd	report_requested	{"user_id": "11111111-1111-1111-1111-111111111102", "report_id": "41e0a5b1-3c50-410c-8c4e-cb844287cc0c", "company_id": "11111111-1111-1111-1111-111111111111"}	2026-05-02 03:09:22.067291+02
59b3097b-1557-447c-91e9-9bacdfdc1fbc	report_requested	{"user_id": "11111111-1111-1111-1111-111111111102", "report_id": "1610e6f8-d004-4e68-a1b3-5785d9ce938a", "company_id": "11111111-1111-1111-1111-111111111111"}	2026-05-02 03:10:02.571719+02
e04c1093-2aa1-449f-989b-82c3b99debd5	report_completed	{"type": "organizational_monthly", "file_url": "/reports/1610e6f8-d004-4e68-a1b3-5785d9ce938a.pdf", "report_id": "1610e6f8-d004-4e68-a1b3-5785d9ce938a", "company_id": "11111111-1111-1111-1111-111111111111"}	2026-05-02 03:10:02.673195+02
4946d3c1-8f52-4b02-ad06-11c6e06838be	report_requested	{"user_id": "11111111-1111-1111-1111-111111111102", "report_id": "993479ae-7dc7-4bc0-ae40-3ec3f5e5cfcc", "company_id": "11111111-1111-1111-1111-111111111111"}	2026-05-02 03:11:41.405761+02
ff52ef18-bf72-425b-b684-84bba6a821ba	risk_created	{"risk_id": "b25b2ecd-a27b-433b-9bd7-df73210298aa", "severity": "Moderate", "company_id": "11111111-1111-1111-1111-111111111111", "created_by": "11111111-1111-1111-1111-111111111102"}	2026-05-02 03:13:33.761465+02
f43512b4-8ae3-41bf-a2af-e573e7c37368	report_requested	{"user_id": "4eab640f-da2f-4b1e-af77-84da540c24b6", "report_id": "971bf978-76b8-476c-b880-b17e3a633441", "company_id": "11111111-1111-1111-1111-111111111111"}	2026-05-02 04:41:25.901781+02
1a5a63ae-12cf-4665-9f44-0a4b7fe42764	report_requested	{"user_id": "4eab640f-da2f-4b1e-af77-84da540c24b6", "report_id": "f2f48e71-a032-43b4-a479-68846c055e9e", "company_id": "11111111-1111-1111-1111-111111111111"}	2026-05-02 04:41:39.795351+02
ae217cc8-e55b-4e12-a570-321030140b15	report_completed	{"type": "cross_site_summary", "file_url": "/reports/f2f48e71-a032-43b4-a479-68846c055e9e.pdf", "report_id": "f2f48e71-a032-43b4-a479-68846c055e9e", "company_id": "11111111-1111-1111-1111-111111111111"}	2026-05-02 04:41:39.874002+02
\.


--
-- Data for Name: system_prompts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_prompts (id, company_id, user_id, title, message, prompt_type, is_read, created_at) FROM stdin;
670f6578-8651-4fbb-976d-dbbf5a70e71a	11111111-1111-1111-1111-111111111111	11111111-1111-1111-1111-111111111104	72h Absence Fallback	The daily oversight review for Rose House has been missed for 72 hours.	ABSENCE_ALERT	f	2026-05-01 08:00:00.698906+02
4607a1e9-566b-4eaf-9c1a-4730ec936840	11111111-1111-1111-1111-111111111111	4eab640f-da2f-4b1e-af77-84da540c24b6	72h Absence Fallback	The daily oversight review for Maple Court has been missed for 72 hours.	ABSENCE_ALERT	f	2026-05-02 08:00:00.085452+02
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (id, company_id, key, value, description, updated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: threshold_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.threshold_events (id, house_id, rule_number, rule_name, cluster_id, output_type, fired_at, acknowledged_by, acknowledged_at, dismissed, dismiss_reason, company_id, pulse_id, description, status, created_at) FROM stdin;
\.


--
-- Data for Name: trend_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trend_metrics (id, company_id, house_id, metric_type, metric_value, period_start, period_end, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: user_houses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_houses (id, user_id, house_id, company_id, role_in_house, assigned_at) FROM stdin;
6b78403e-4b32-4943-8049-889949a79311	11111111-1111-1111-1111-111111111101	11111111-2222-3333-4444-555555555555	11111111-1111-1111-1111-111111111111	TEAM_LEADER	2026-04-30 13:04:53.782103+02
421132b6-0e88-47f1-b5e7-9755563c44e4	11111111-1111-1111-1111-111111111102	11111111-2222-3333-4444-555555555555	11111111-1111-1111-1111-111111111111	REGISTERED_MANAGER	2026-04-30 13:04:53.794711+02
dca7b7f6-ff1b-44dc-bb8d-a2246943baa5	11111111-1111-1111-1111-111111111102	22222222-2222-3333-4444-555555555555	11111111-1111-1111-1111-111111111111	\N	2026-05-01 04:25:19.424626+02
4b9ec771-3641-4c79-a5d7-44aa3eef0c32	11111111-1111-1111-1111-111111111105	22222222-2222-3333-4444-555555555555	11111111-1111-1111-1111-111111111111	\N	2026-05-01 11:37:47.508269+02
f838bcf3-c377-4e35-904e-365b53d7705b	11111111-1111-1111-1111-111111111106	33333333-3333-3333-4444-555555555555	11111111-1111-1111-1111-111111111111	\N	2026-05-01 11:37:47.508269+02
022f9840-8516-4cda-ac02-72924666f0ab	11111111-1111-1111-1111-111111111107	33333333-3333-3333-4444-555555555555	11111111-1111-1111-1111-111111111111	\N	2026-05-01 11:37:47.508269+02
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_profiles (id, user_id, phone, job_title, avatar_url, bio, notification_preferences, timezone, created_at, updated_at) FROM stdin;
33a64145-20a6-46cc-876e-6024929a2848	929aa66d-1b4d-4233-aeaa-9cecd27e96b8	\N	\N	\N	\N	{"sms": false, "email": true, "in_app": true}	UTC	2026-05-02 04:38:34.498226+02	2026-05-02 04:38:34.498226+02
bed7d1c8-71a2-4361-9d76-54e8e5b21ba4	4eab640f-da2f-4b1e-af77-84da540c24b6	\N	\N	\N	\N	{"sms": false, "email": true, "in_app": true}	UTC	2026-05-02 04:40:16.920724+02	2026-05-02 04:40:16.920724+02
ae042ebb-3680-453b-b8f4-8b7670a9cce4	11111111-1111-1111-1111-111111111103	\N	\N	data:image/png;base64,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	\N	{"sms": false, "email": true, "in_app": true}	UTC	2026-05-02 05:19:56.322483+02	2026-05-02 05:19:56.322483+02
876f389d-2431-4ad7-a536-5f69737fbdae	6aa7315c-973c-4f73-8f5c-c458973eb04f	\N	System Super Administrator	\N	\N	{"sms": false, "email": true, "in_app": true}	UTC	2026-05-02 06:36:06.708628+02	2026-05-02 06:36:06.708628+02
\.


--
-- Data for Name: user_service_units; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_service_units (id, user_id, service_unit_id, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, company_id, email, password_hash, first_name, last_name, role, status, last_login, password_reset_token, password_reset_expires, email_verified, mfa_enabled, created_at, updated_at, last_login_at, pulse_days) FROM stdin;
1cd1f595-2a37-44a0-8ee0-82ad4cd05bc2	11111111-1111-1111-1111-111111111111	superadmin1@ordincore.com	$2a$10$vg9v3qQ1AYhFM7Car.6Z3OowmmC4S877/UhQG0Vv8GGWSoFKc.A0y	System	Superadmin	SUPER_ADMIN	active	\N	\N	\N	f	f	2026-05-02 04:23:16.65316+02	2026-05-02 04:23:16.65316+02	\N	[]
4eab640f-da2f-4b1e-af77-84da540c24b6	11111111-1111-1111-1111-111111111111	dir@ordincore.co.uk	$2a$12$QVccs.OZUZwJ4d.o.4J3meeYHiwHEQ0T2UuSDXUPBZSGH5VN/UYJG	director	chal	DIRECTOR	active	2026-05-02 04:40:48.099+02	\N	\N	f	f	2026-05-02 04:40:16.912904+02	2026-05-02 04:40:48.099957+02	\N	[]
11111111-1111-1111-1111-111111111102	11111111-1111-1111-1111-111111111111	sam@ordincore.com	$2a$12$gtkBdiithL52A.KSvtujyO1Kj71YfxuFvNrhByCUGKEDwjSVZqE8m	Sam	Rivers	REGISTERED_MANAGER	active	2026-05-02 03:32:30.727+02	\N	\N	f	f	2026-04-30 13:04:53.793442+02	2026-05-02 07:31:02.564227+02	\N	[]
11111111-1111-1111-1111-111111111103	11111111-1111-1111-1111-111111111111	chris@ordincore.com	$2a$12$gtkBdiithL52A.KSvtujyO1Kj71YfxuFvNrhByCUGKEDwjSVZqE8m	Chris	Assurance	RESPONSIBLE_INDIVIDUAL	active	2026-05-02 05:05:51.114+02	\N	\N	f	f	2026-04-30 13:04:53.798853+02	2026-05-02 07:31:02.564227+02	\N	[]
11111111-1111-1111-1111-111111111104	11111111-1111-1111-1111-111111111111	pat@ordincore.com	$2a$12$s4Yd9/QwKsn5FkVqPhMgC.CUguSOli/K6uyeaV7071bqUiaqKlqzW	Pat	Director	DIRECTOR	active	2026-05-01 04:08:19.531+02	\N	\N	f	f	2026-04-30 13:04:53.801188+02	2026-05-02 07:31:02.564227+02	\N	[]
11111111-1111-1111-1111-111111111105	11111111-1111-1111-1111-111111111111	jordan@ordincore.com	$2a$12$gtkBdiithL52A.KSvtujyO1Kj71YfxuFvNrhByCUGKEDwjSVZqE8m	Jordan	User	TEAM_LEADER	active	2026-05-02 04:04:00.883+02	\N	\N	f	f	2026-05-01 11:37:47.508269+02	2026-05-02 07:31:02.564227+02	\N	[]
11111111-1111-1111-1111-111111111106	11111111-1111-1111-1111-111111111111	casey@ordincore.com	$2a$10$lCHQfjoyVL9DEonIAvUoDOEaYtCI10rwwJt0F6VG8sioii2sBPPhm	Casey	User	TEAM_LEADER	active	\N	\N	\N	f	f	2026-05-01 11:37:47.508269+02	2026-05-02 07:31:02.564227+02	\N	[]
11111111-1111-1111-1111-111111111107	11111111-1111-1111-1111-111111111111	alex@ordincore.com	$2a$10$lCHQfjoyVL9DEonIAvUoDOEaYtCI10rwwJt0F6VG8sioii2sBPPhm	Alex	User	REGISTERED_MANAGER	active	\N	\N	\N	f	f	2026-05-01 11:37:47.508269+02	2026-05-02 07:31:02.564227+02	\N	[]
11111111-1111-1111-1111-ffffffffff02	11111111-1111-1111-1111-111111111111	superadmin2@ordincore.co.uk	$2a$10$vg9v3qQ1AYhFM7Car.6Z3OowmmC4S877/UhQG0Vv8GGWSoFKc.A0y	System	Superadmin 2	SUPER_ADMIN	active	\N	\N	\N	f	f	2026-05-02 04:09:48.15084+02	2026-05-02 04:09:48.15084+02	\N	[]
11111111-1111-1111-1111-ffffffffff04	11111111-1111-1111-1111-111111111111	superadmin4@ordincore.co.uk	$2a$10$vg9v3qQ1AYhFM7Car.6Z3OowmmC4S877/UhQG0Vv8GGWSoFKc.A0y	System	Superadmin 4	SUPER_ADMIN	active	\N	\N	\N	f	f	2026-05-02 04:09:48.15084+02	2026-05-02 04:09:48.15084+02	\N	[]
11111111-1111-1111-1111-ffffffffff03	11111111-1111-1111-1111-111111111111	superadmin3@ordincore.co.uk	$2a$10$vg9v3qQ1AYhFM7Car.6Z3OowmmC4S877/UhQG0Vv8GGWSoFKc.A0y	System	Superadmin 3	SUPER_ADMIN	active	2026-05-02 04:37:51.025+02	\N	\N	f	f	2026-05-02 04:09:48.15084+02	2026-05-02 04:37:51.026492+02	\N	[]
929aa66d-1b4d-4233-aeaa-9cecd27e96b8	11111111-1111-1111-1111-111111111111	admin2@ordincore.com	$2a$12$zVfnMeKH6TL18IRRIkKOSeOwkGQow7OZqbCZMSNkiG9183XBEh0Dy	second	admin	ADMIN	active	2026-05-02 04:38:52.853+02	\N	\N	f	f	2026-05-02 04:38:34.490726+02	2026-05-02 04:38:52.854799+02	\N	[]
11111111-1111-1111-1111-ffffffffff01	11111111-1111-1111-1111-111111111111	superadmin1@ordincore.co.uk	$2a$12$K10XQZHY5V5GvwIzBfb/E.7Nk5lb2VwQ5Vx95T6VssLt9v4tqG9t.	System	Superadmin 1	SUPER_ADMIN	active	2026-05-02 04:40:46.051+02	\N	\N	f	f	2026-05-02 04:09:48.15084+02	2026-05-02 04:40:46.052249+02	\N	[]
b4171c94-2fbb-4519-85a5-1be892a4925a	11111111-1111-1111-1111-111111111111	admin@ordincore.com	$2a$12$a2G4KVa3OH8jesv7kQ3Ip.GzWdyNOSCxsde/NxxqOEQUX3rOgf5Ua	System	Admin	ADMIN	active	2026-05-02 05:04:07.117+02	\N	\N	f	f	2026-05-02 03:38:14.695177+02	2026-05-02 05:04:07.118319+02	\N	[]
6aa7315c-973c-4f73-8f5c-c458973eb04f	\N	superadmin@caresignal.com	$2a$12$WMBuQfvN6gGj6NUgA55O6eOpIkfiTuAbzSEkfzApeXsEnEXn1S2p6	Super	Admin	SUPER_ADMIN	active	\N	\N	\N	f	f	2026-05-02 06:36:06.708628+02	2026-05-02 06:36:06.708628+02	\N	[]
11111111-1111-1111-1111-111111111101	11111111-1111-1111-1111-111111111111	taylor@ordincore.com	$2a$12$gtkBdiithL52A.KSvtujyO1Kj71YfxuFvNrhByCUGKEDwjSVZqE8m	Taylor	Rose	TEAM_LEADER	active	2026-05-01 20:52:34.935+02	\N	\N	f	f	2026-04-30 13:04:53.77809+02	2026-05-02 07:31:02.564227+02	\N	[]
\.


--
-- Data for Name: websocket_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.websocket_sessions (id, user_id, company_id, socket_id, connected_at, disconnected_at, is_active) FROM stdin;
\.


--
-- Data for Name: weekly_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.weekly_reviews (id, company_id, house_id, week_ending, status, content, created_by, created_at, updated_at, step_reached, governance_narrative, overall_position) FROM stdin;
\.


--
-- Name: _migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public._migrations_id_seq', 62, true);


--
-- Name: _migrations _migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT _migrations_filename_key UNIQUE (filename);


--
-- Name: _migrations _migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT _migrations_pkey PRIMARY KEY (id);


--
-- Name: action_effectiveness action_effectiveness_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.action_effectiveness
    ADD CONSTRAINT action_effectiveness_pkey PRIMARY KEY (id);


--
-- Name: addendums addendums_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addendums
    ADD CONSTRAINT addendums_pkey PRIMARY KEY (id);


--
-- Name: analytics_snapshots analytics_snapshots_company_id_snapshot_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics_snapshots
    ADD CONSTRAINT analytics_snapshots_company_id_snapshot_date_key UNIQUE (company_id, snapshot_date);


--
-- Name: analytics_snapshots analytics_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics_snapshots
    ADD CONSTRAINT analytics_snapshots_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: companies companies_domain_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_domain_key UNIQUE (domain);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: control_failure_flags control_failure_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_failure_flags
    ADD CONSTRAINT control_failure_flags_pkey PRIMARY KEY (id);


--
-- Name: daily_governance_log daily_governance_log_house_id_review_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_governance_log
    ADD CONSTRAINT daily_governance_log_house_id_review_date_key UNIQUE (house_id, review_date);


--
-- Name: daily_governance_log daily_governance_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_governance_log
    ADD CONSTRAINT daily_governance_log_pkey PRIMARY KEY (id);


--
-- Name: detected_patterns detected_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detected_patterns
    ADD CONSTRAINT detected_patterns_pkey PRIMARY KEY (id);


--
-- Name: director_interventions director_interventions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.director_interventions
    ADD CONSTRAINT director_interventions_pkey PRIMARY KEY (id);


--
-- Name: escalation_actions escalation_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalation_actions
    ADD CONSTRAINT escalation_actions_pkey PRIMARY KEY (id);


--
-- Name: escalation_decisions escalation_decisions_escalation_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalation_decisions
    ADD CONSTRAINT escalation_decisions_escalation_id_key UNIQUE (escalation_id);


--
-- Name: escalation_decisions escalation_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalation_decisions
    ADD CONSTRAINT escalation_decisions_pkey PRIMARY KEY (id);


--
-- Name: escalations escalations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalations
    ADD CONSTRAINT escalations_pkey PRIMARY KEY (id);


--
-- Name: evidence_pack_requests evidence_pack_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_pack_requests
    ADD CONSTRAINT evidence_pack_requests_pkey PRIMARY KEY (id);


--
-- Name: governance_answers governance_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_answers
    ADD CONSTRAINT governance_answers_pkey PRIMARY KEY (id);


--
-- Name: governance_answers governance_answers_pulse_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_answers
    ADD CONSTRAINT governance_answers_pulse_id_question_id_key UNIQUE (pulse_id, question_id);


--
-- Name: governance_health_checks governance_health_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_health_checks
    ADD CONSTRAINT governance_health_checks_pkey PRIMARY KEY (id);


--
-- Name: governance_pulses governance_pulses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_pulses
    ADD CONSTRAINT governance_pulses_pkey PRIMARY KEY (id);


--
-- Name: governance_questions governance_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_questions
    ADD CONSTRAINT governance_questions_pkey PRIMARY KEY (id);


--
-- Name: governance_schedules governance_schedules_company_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_schedules
    ADD CONSTRAINT governance_schedules_company_id_key UNIQUE (company_id);


--
-- Name: governance_schedules governance_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_schedules
    ADD CONSTRAINT governance_schedules_pkey PRIMARY KEY (id);


--
-- Name: governance_templates governance_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_templates
    ADD CONSTRAINT governance_templates_pkey PRIMARY KEY (id);


--
-- Name: house_settings house_settings_house_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.house_settings
    ADD CONSTRAINT house_settings_house_id_key UNIQUE (house_id);


--
-- Name: house_settings house_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.house_settings
    ADD CONSTRAINT house_settings_pkey PRIMARY KEY (id);


--
-- Name: houses houses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.houses
    ADD CONSTRAINT houses_pkey PRIMARY KEY (id);


--
-- Name: incident_attachments incident_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_attachments
    ADD CONSTRAINT incident_attachments_pkey PRIMARY KEY (id);


--
-- Name: incident_categories incident_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_categories
    ADD CONSTRAINT incident_categories_pkey PRIMARY KEY (id);


--
-- Name: incident_escalations incident_escalations_incident_id_escalation_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_escalations
    ADD CONSTRAINT incident_escalations_incident_id_escalation_id_key UNIQUE (incident_id, escalation_id);


--
-- Name: incident_escalations incident_escalations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_escalations
    ADD CONSTRAINT incident_escalations_pkey PRIMARY KEY (id);


--
-- Name: incident_events incident_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_events
    ADD CONSTRAINT incident_events_pkey PRIMARY KEY (id);


--
-- Name: incident_reconstruction incident_reconstruction_incident_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstruction
    ADD CONSTRAINT incident_reconstruction_incident_id_key UNIQUE (incident_id);


--
-- Name: incident_reconstruction incident_reconstruction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstruction
    ADD CONSTRAINT incident_reconstruction_pkey PRIMARY KEY (id);


--
-- Name: incident_reconstruction_pulses incident_reconstruction_pulses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstruction_pulses
    ADD CONSTRAINT incident_reconstruction_pulses_pkey PRIMARY KEY (id);


--
-- Name: incident_reconstruction_pulses incident_reconstruction_pulses_reconstruction_id_pulse_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstruction_pulses
    ADD CONSTRAINT incident_reconstruction_pulses_reconstruction_id_pulse_id_key UNIQUE (reconstruction_id, pulse_id);


--
-- Name: incident_reconstructions incident_reconstructions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstructions
    ADD CONSTRAINT incident_reconstructions_pkey PRIMARY KEY (id);


--
-- Name: incident_risks incident_risks_incident_id_risk_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_risks
    ADD CONSTRAINT incident_risks_incident_id_risk_id_key UNIQUE (incident_id, risk_id);


--
-- Name: incident_risks incident_risks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_risks
    ADD CONSTRAINT incident_risks_pkey PRIMARY KEY (id);


--
-- Name: incidents incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);


--
-- Name: job_logs job_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_logs
    ADD CONSTRAINT job_logs_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: monthly_board_reports monthly_board_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_board_reports
    ADD CONSTRAINT monthly_board_reports_pkey PRIMARY KEY (id);


--
-- Name: monthly_reports monthly_reports_company_id_report_month_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_reports
    ADD CONSTRAINT monthly_reports_company_id_report_month_key UNIQUE (company_id, report_month);


--
-- Name: monthly_reports monthly_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_reports
    ADD CONSTRAINT monthly_reports_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: pulse_risk_links pulse_risk_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pulse_risk_links
    ADD CONSTRAINT pulse_risk_links_pkey PRIMARY KEY (id);


--
-- Name: pulse_risk_links pulse_risk_links_pulse_id_risk_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pulse_risk_links
    ADD CONSTRAINT pulse_risk_links_pulse_id_risk_id_key UNIQUE (pulse_id, risk_id);


--
-- Name: report_cache report_cache_company_id_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_cache
    ADD CONSTRAINT report_cache_company_id_cache_key_key UNIQUE (company_id, cache_key);


--
-- Name: report_cache report_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_cache
    ADD CONSTRAINT report_cache_pkey PRIMARY KEY (id);


--
-- Name: report_exports report_exports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT report_exports_pkey PRIMARY KEY (id);


--
-- Name: report_requests report_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_requests
    ADD CONSTRAINT report_requests_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: ri_acknowledgements ri_acknowledgements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ri_acknowledgements
    ADD CONSTRAINT ri_acknowledgements_pkey PRIMARY KEY (id);


--
-- Name: ri_queries ri_queries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ri_queries
    ADD CONSTRAINT ri_queries_pkey PRIMARY KEY (id);


--
-- Name: risk_actions risk_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_actions
    ADD CONSTRAINT risk_actions_pkey PRIMARY KEY (id);


--
-- Name: risk_attachments risk_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_attachments
    ADD CONSTRAINT risk_attachments_pkey PRIMARY KEY (id);


--
-- Name: risk_candidates risk_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_candidates
    ADD CONSTRAINT risk_candidates_pkey PRIMARY KEY (id);


--
-- Name: risk_categories risk_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_categories
    ADD CONSTRAINT risk_categories_pkey PRIMARY KEY (id);


--
-- Name: risk_events risk_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_events
    ADD CONSTRAINT risk_events_pkey PRIMARY KEY (id);


--
-- Name: risk_signal_links risk_signal_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_signal_links
    ADD CONSTRAINT risk_signal_links_pkey PRIMARY KEY (id);


--
-- Name: risks risks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: signal_clusters signal_clusters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.signal_clusters
    ADD CONSTRAINT signal_clusters_pkey PRIMARY KEY (id);


--
-- Name: system_events system_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_events
    ADD CONSTRAINT system_events_pkey PRIMARY KEY (id);


--
-- Name: system_prompts system_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_prompts
    ADD CONSTRAINT system_prompts_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_company_id_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_company_id_key_key UNIQUE (company_id, key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: threshold_events threshold_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.threshold_events
    ADD CONSTRAINT threshold_events_pkey PRIMARY KEY (id);


--
-- Name: trend_metrics trend_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trend_metrics
    ADD CONSTRAINT trend_metrics_pkey PRIMARY KEY (id);


--
-- Name: user_houses user_houses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_houses
    ADD CONSTRAINT user_houses_pkey PRIMARY KEY (id);


--
-- Name: user_houses user_houses_user_id_house_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_houses
    ADD CONSTRAINT user_houses_user_id_house_id_key UNIQUE (user_id, house_id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: user_service_units user_service_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_service_units
    ADD CONSTRAINT user_service_units_pkey PRIMARY KEY (id);


--
-- Name: user_service_units user_service_units_user_id_service_unit_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_service_units
    ADD CONSTRAINT user_service_units_user_id_service_unit_id_key UNIQUE (user_id, service_unit_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: websocket_sessions websocket_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.websocket_sessions
    ADD CONSTRAINT websocket_sessions_pkey PRIMARY KEY (id);


--
-- Name: weekly_reviews weekly_reviews_house_id_week_ending_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_reviews
    ADD CONSTRAINT weekly_reviews_house_id_week_ending_key UNIQUE (house_id, week_ending);


--
-- Name: weekly_reviews weekly_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_reviews
    ADD CONSTRAINT weekly_reviews_pkey PRIMARY KEY (id);


--
-- Name: idx_analytics_snapshots_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_analytics_snapshots_company_id ON public.analytics_snapshots USING btree (company_id);


--
-- Name: idx_analytics_snapshots_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_analytics_snapshots_date ON public.analytics_snapshots USING btree (snapshot_date DESC);


--
-- Name: idx_audit_company_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_company_created ON public.audit_logs USING btree (company_id, created_at DESC);


--
-- Name: idx_audit_logs_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_company_id ON public.audit_logs USING btree (company_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_resource; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_resource ON public.audit_logs USING btree (resource, resource_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_companies_domain; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_domain ON public.companies USING btree (domain);


--
-- Name: idx_companies_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_status ON public.companies USING btree (status);


--
-- Name: idx_control_failure_service; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_control_failure_service ON public.control_failure_flags USING btree (service_id);


--
-- Name: idx_control_failure_unresolved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_control_failure_unresolved ON public.control_failure_flags USING btree (resolved_at) WHERE (resolved_at IS NULL);


--
-- Name: idx_daily_gov_log_house_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_gov_log_house_date ON public.daily_governance_log USING btree (house_id, review_date);


--
-- Name: idx_daily_governance_log_house_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_governance_log_house_date ON public.daily_governance_log USING btree (house_id, review_date);


--
-- Name: idx_director_int_director; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_director_int_director ON public.director_interventions USING btree (director_user_id);


--
-- Name: idx_director_int_service; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_director_int_service ON public.director_interventions USING btree (service_id);


--
-- Name: idx_escalation_actions_escalation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_escalation_actions_escalation_id ON public.escalation_actions USING btree (escalation_id);


--
-- Name: idx_escalations_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_escalations_company ON public.escalations USING btree (company_id);


--
-- Name: idx_escalations_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_escalations_company_id ON public.escalations USING btree (company_id);


--
-- Name: idx_escalations_escalated_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_escalations_escalated_to ON public.escalations USING btree (escalated_to);


--
-- Name: idx_escalations_incident_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_escalations_incident_id ON public.escalations USING btree (incident_id);


--
-- Name: idx_escalations_risk_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_escalations_risk_id ON public.escalations USING btree (risk_id);


--
-- Name: idx_escalations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_escalations_status ON public.escalations USING btree (status);


--
-- Name: idx_governance_answers_pulse_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_governance_answers_pulse_id ON public.governance_answers USING btree (pulse_id);


--
-- Name: idx_governance_pulses_assigned_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_governance_pulses_assigned_user_id ON public.governance_pulses USING btree (assigned_user_id);


--
-- Name: idx_governance_pulses_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_governance_pulses_company_id ON public.governance_pulses USING btree (company_id);


--
-- Name: idx_governance_pulses_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_governance_pulses_created_by ON public.governance_pulses USING btree (created_by);


--
-- Name: idx_governance_pulses_house_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_governance_pulses_house_date ON public.governance_pulses USING btree (house_id, entry_date);


--
-- Name: idx_governance_pulses_house_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_governance_pulses_house_id ON public.governance_pulses USING btree (house_id);


--
-- Name: idx_governance_pulses_review_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_governance_pulses_review_status ON public.governance_pulses USING btree (review_status, created_at);


--
-- Name: idx_governance_questions_template_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_governance_questions_template_id ON public.governance_questions USING btree (template_id);


--
-- Name: idx_governance_templates_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_governance_templates_company_id ON public.governance_templates USING btree (company_id);


--
-- Name: idx_houses_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_houses_company_id ON public.houses USING btree (company_id);


--
-- Name: idx_houses_manager_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_houses_manager_id ON public.houses USING btree (manager_id);


--
-- Name: idx_houses_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_houses_status ON public.houses USING btree (status);


--
-- Name: idx_incident_attachments_incident_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_attachments_incident_id ON public.incident_attachments USING btree (incident_id);


--
-- Name: idx_incident_categories_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_categories_company_id ON public.incident_categories USING btree (company_id);


--
-- Name: idx_incident_escalations_incident; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_escalations_incident ON public.incident_escalations USING btree (incident_id);


--
-- Name: idx_incident_events_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_events_company_id ON public.incident_events USING btree (company_id);


--
-- Name: idx_incident_events_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_events_created_at ON public.incident_events USING btree (created_at);


--
-- Name: idx_incident_events_event_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_events_event_type ON public.incident_events USING btree (event_type);


--
-- Name: idx_incident_events_incident_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_events_incident_id ON public.incident_events USING btree (incident_id);


--
-- Name: idx_incident_reconstruction_incident; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_reconstruction_incident ON public.incident_reconstruction USING btree (incident_id);


--
-- Name: idx_incident_reconstruction_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_reconstruction_status ON public.incident_reconstruction USING btree (status);


--
-- Name: idx_incident_risks_incident; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_risks_incident ON public.incident_risks USING btree (incident_id);


--
-- Name: idx_incidents_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incidents_company_id ON public.incidents USING btree (company_id);


--
-- Name: idx_incidents_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incidents_created_by ON public.incidents USING btree (created_by);


--
-- Name: idx_incidents_house_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incidents_house_id ON public.incidents USING btree (house_id);


--
-- Name: idx_incidents_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incidents_is_active ON public.incidents USING btree (is_active);


--
-- Name: idx_incidents_occurred_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incidents_occurred_at ON public.incidents USING btree (occurred_at);


--
-- Name: idx_incidents_severity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incidents_severity ON public.incidents USING btree (severity);


--
-- Name: idx_incidents_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incidents_status ON public.incidents USING btree (status);


--
-- Name: idx_jobs_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_company_id ON public.jobs USING btree (company_id);


--
-- Name: idx_jobs_queue_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_queue_name ON public.jobs USING btree (queue_name);


--
-- Name: idx_jobs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);


--
-- Name: idx_monthly_reports_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_monthly_reports_company ON public.monthly_board_reports USING btree (company_id);


--
-- Name: idx_monthly_reports_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_monthly_reports_period ON public.monthly_board_reports USING btree (report_period_start, report_period_end);


--
-- Name: idx_notifications_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_company_id ON public.notifications USING btree (company_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, is_read, created_at DESC);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_patterns_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patterns_company ON public.detected_patterns USING btree (company_id);


--
-- Name: idx_pulses_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pulses_company ON public.governance_pulses USING btree (company_id);


--
-- Name: idx_pulses_service_week; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pulses_service_week ON public.governance_pulses USING btree (house_id, week_start);


--
-- Name: idx_reconstruction_pulses_link; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reconstruction_pulses_link ON public.incident_reconstruction_pulses USING btree (reconstruction_id, pulse_id);


--
-- Name: idx_report_cache_company_cache; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_cache_company_cache ON public.report_cache USING btree (company_id, cache_key);


--
-- Name: idx_report_cache_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_cache_expires ON public.report_cache USING btree (expires_at);


--
-- Name: idx_reports_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_company_id ON public.reports USING btree (company_id);


--
-- Name: idx_reports_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_created_at ON public.reports USING btree (created_at DESC);


--
-- Name: idx_reports_generated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_generated_by ON public.reports USING btree (generated_by);


--
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_status ON public.reports USING btree (status);


--
-- Name: idx_ri_ack_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ri_ack_created ON public.ri_acknowledgements USING btree (acknowledged_at);


--
-- Name: idx_ri_ack_incident; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ri_ack_incident ON public.ri_acknowledgements USING btree (incident_id);


--
-- Name: idx_ri_ack_ri_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ri_ack_ri_user ON public.ri_acknowledgements USING btree (ri_user_id);


--
-- Name: idx_ri_queries_resolved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ri_queries_resolved ON public.ri_queries USING btree (resolved_at) WHERE (resolved_at IS NULL);


--
-- Name: idx_ri_queries_review; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ri_queries_review ON public.ri_queries USING btree (weekly_review_id);


--
-- Name: idx_risk_actions_effectiveness_measured_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_actions_effectiveness_measured_at ON public.risk_actions USING btree (effectiveness_measured_at);


--
-- Name: idx_risk_actions_linked_review; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_actions_linked_review ON public.risk_actions USING btree (linked_review_id);


--
-- Name: idx_risk_actions_risk_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_actions_risk_id ON public.risk_actions USING btree (risk_id);


--
-- Name: idx_risk_attachments_risk_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_attachments_risk_id ON public.risk_attachments USING btree (risk_id);


--
-- Name: idx_risk_candidates_cluster_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_candidates_cluster_id ON public.risk_candidates USING btree (cluster_id);


--
-- Name: idx_risk_candidates_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_candidates_company_id ON public.risk_candidates USING btree (company_id);


--
-- Name: idx_risk_candidates_house_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_candidates_house_id ON public.risk_candidates USING btree (house_id);


--
-- Name: idx_risk_candidates_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_candidates_status ON public.risk_candidates USING btree (status);


--
-- Name: idx_risk_events_risk_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_events_risk_id ON public.risk_events USING btree (risk_id);


--
-- Name: idx_risk_signal_links_cluster_pulse; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_risk_signal_links_cluster_pulse ON public.risk_signal_links USING btree (cluster_id, pulse_entry_id) WHERE (cluster_id IS NOT NULL);


--
-- Name: idx_risk_signal_links_risk_pulse; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_risk_signal_links_risk_pulse ON public.risk_signal_links USING btree (risk_id, pulse_entry_id) WHERE (risk_id IS NOT NULL);


--
-- Name: idx_risks_closed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_closed_at ON public.risks USING btree (closed_at);


--
-- Name: idx_risks_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_company_id ON public.risks USING btree (company_id);


--
-- Name: idx_risks_house_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_house_id ON public.risks USING btree (house_id);


--
-- Name: idx_risks_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_is_active ON public.risks USING btree (is_active);


--
-- Name: idx_risks_severity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_severity ON public.risks USING btree (severity);


--
-- Name: idx_risks_source_cluster; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_source_cluster ON public.risks USING btree (source_cluster_id);


--
-- Name: idx_risks_source_cluster_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_source_cluster_id ON public.risks USING btree (source_cluster_id);


--
-- Name: idx_risks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_status ON public.risks USING btree (status);


--
-- Name: idx_risks_trajectory; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_trajectory ON public.risks USING btree (trajectory);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- Name: idx_sgc_mv_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_sgc_mv_unique ON public.service_governance_compliance_mv USING btree (house_id, review_date);


--
-- Name: idx_signal_clusters_house_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_signal_clusters_house_status ON public.signal_clusters USING btree (house_id, cluster_status);


--
-- Name: idx_stability_house; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_stability_house ON public.service_unit_stability USING btree (house_id);


--
-- Name: idx_system_events_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_events_created_at ON public.system_events USING btree (created_at DESC);


--
-- Name: idx_system_events_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_events_type ON public.system_events USING btree (event_type);


--
-- Name: idx_system_settings_company_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_settings_company_key ON public.system_settings USING btree (company_id, key);


--
-- Name: idx_threshold_events_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_threshold_events_created_at ON public.threshold_events USING btree (created_at);


--
-- Name: idx_threshold_events_house_fired; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_threshold_events_house_fired ON public.threshold_events USING btree (house_id, fired_at);


--
-- Name: idx_trend_metrics_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trend_metrics_company_id ON public.trend_metrics USING btree (company_id);


--
-- Name: idx_trend_metrics_metric_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trend_metrics_metric_type ON public.trend_metrics USING btree (metric_type);


--
-- Name: idx_trend_metrics_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trend_metrics_period ON public.trend_metrics USING btree (period_start, period_end);


--
-- Name: idx_user_houses_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_houses_company_id ON public.user_houses USING btree (company_id);


--
-- Name: idx_user_houses_house_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_houses_house_id ON public.user_houses USING btree (house_id);


--
-- Name: idx_user_houses_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_houses_user_id ON public.user_houses USING btree (user_id);


--
-- Name: idx_user_profiles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);


--
-- Name: idx_users_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_company_id ON public.users USING btree (company_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_websocket_sessions_socket_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_websocket_sessions_socket_id ON public.websocket_sessions USING btree (socket_id);


--
-- Name: idx_websocket_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_websocket_sessions_user_id ON public.websocket_sessions USING btree (user_id);


--
-- Name: addendums no_delete_addendums; Type: RULE; Schema: public; Owner: postgres
--

CREATE RULE no_delete_addendums AS
    ON DELETE TO public.addendums DO INSTEAD NOTHING;


--
-- Name: addendums no_update_addendums; Type: RULE; Schema: public; Owner: postgres
--

CREATE RULE no_update_addendums AS
    ON UPDATE TO public.addendums DO INSTEAD NOTHING;


--
-- Name: escalations refresh_stability_on_escalation_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER refresh_stability_on_escalation_change AFTER INSERT OR UPDATE ON public.escalations FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_stability();


--
-- Name: action_effectiveness action_effectiveness_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.action_effectiveness
    ADD CONSTRAINT action_effectiveness_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.risk_actions(id) ON DELETE CASCADE;


--
-- Name: action_effectiveness action_effectiveness_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.action_effectiveness
    ADD CONSTRAINT action_effectiveness_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: action_effectiveness action_effectiveness_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.action_effectiveness
    ADD CONSTRAINT action_effectiveness_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;


--
-- Name: action_effectiveness action_effectiveness_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.action_effectiveness
    ADD CONSTRAINT action_effectiveness_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id) ON DELETE SET NULL;


--
-- Name: addendums addendums_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addendums
    ADD CONSTRAINT addendums_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: addendums addendums_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addendums
    ADD CONSTRAINT addendums_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: analytics_snapshots analytics_snapshots_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics_snapshots
    ADD CONSTRAINT analytics_snapshots_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: control_failure_flags control_failure_flags_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_failure_flags
    ADD CONSTRAINT control_failure_flags_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: control_failure_flags control_failure_flags_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_failure_flags
    ADD CONSTRAINT control_failure_flags_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id) ON DELETE SET NULL;


--
-- Name: control_failure_flags control_failure_flags_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_failure_flags
    ADD CONSTRAINT control_failure_flags_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.houses(id) ON DELETE CASCADE;


--
-- Name: daily_governance_log daily_governance_log_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_governance_log
    ADD CONSTRAINT daily_governance_log_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;


--
-- Name: daily_governance_log daily_governance_log_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_governance_log
    ADD CONSTRAINT daily_governance_log_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: detected_patterns detected_patterns_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detected_patterns
    ADD CONSTRAINT detected_patterns_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: director_interventions director_interventions_director_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.director_interventions
    ADD CONSTRAINT director_interventions_director_user_id_fkey FOREIGN KEY (director_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: director_interventions director_interventions_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.director_interventions
    ADD CONSTRAINT director_interventions_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.houses(id) ON DELETE CASCADE;


--
-- Name: director_interventions director_interventions_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.director_interventions
    ADD CONSTRAINT director_interventions_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: escalation_actions escalation_actions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalation_actions
    ADD CONSTRAINT escalation_actions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: escalation_actions escalation_actions_escalation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalation_actions
    ADD CONSTRAINT escalation_actions_escalation_id_fkey FOREIGN KEY (escalation_id) REFERENCES public.escalations(id) ON DELETE CASCADE;


--
-- Name: escalation_actions escalation_actions_taken_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalation_actions
    ADD CONSTRAINT escalation_actions_taken_by_fkey FOREIGN KEY (taken_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: escalation_decisions escalation_decisions_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalation_decisions
    ADD CONSTRAINT escalation_decisions_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.users(id);


--
-- Name: escalation_decisions escalation_decisions_escalation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalation_decisions
    ADD CONSTRAINT escalation_decisions_escalation_id_fkey FOREIGN KEY (escalation_id) REFERENCES public.escalations(id);


--
-- Name: escalation_decisions escalation_decisions_locked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalation_decisions
    ADD CONSTRAINT escalation_decisions_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.users(id);


--
-- Name: escalations escalations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalations
    ADD CONSTRAINT escalations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: escalations escalations_escalated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalations
    ADD CONSTRAINT escalations_escalated_by_fkey FOREIGN KEY (escalated_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: escalations escalations_escalated_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalations
    ADD CONSTRAINT escalations_escalated_to_fkey FOREIGN KEY (escalated_to) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: escalations escalations_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalations
    ADD CONSTRAINT escalations_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;


--
-- Name: escalations escalations_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalations
    ADD CONSTRAINT escalations_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON DELETE SET NULL;


--
-- Name: escalations escalations_service_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalations
    ADD CONSTRAINT escalations_service_unit_id_fkey FOREIGN KEY (service_unit_id) REFERENCES public.houses(id);


--
-- Name: evidence_pack_requests evidence_pack_requests_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_pack_requests
    ADD CONSTRAINT evidence_pack_requests_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;


--
-- Name: evidence_pack_requests evidence_pack_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_pack_requests
    ADD CONSTRAINT evidence_pack_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: governance_answers governance_answers_answered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_answers
    ADD CONSTRAINT governance_answers_answered_by_fkey FOREIGN KEY (answered_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: governance_answers governance_answers_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_answers
    ADD CONSTRAINT governance_answers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: governance_answers governance_answers_pulse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_answers
    ADD CONSTRAINT governance_answers_pulse_id_fkey FOREIGN KEY (pulse_id) REFERENCES public.governance_pulses(id) ON DELETE CASCADE;


--
-- Name: governance_answers governance_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_answers
    ADD CONSTRAINT governance_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.governance_questions(id) ON DELETE RESTRICT;


--
-- Name: governance_health_checks governance_health_checks_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_health_checks
    ADD CONSTRAINT governance_health_checks_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: governance_health_checks governance_health_checks_locked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_health_checks
    ADD CONSTRAINT governance_health_checks_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.users(id);


--
-- Name: governance_pulses governance_pulses_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_pulses
    ADD CONSTRAINT governance_pulses_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: governance_pulses governance_pulses_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_pulses
    ADD CONSTRAINT governance_pulses_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: governance_pulses governance_pulses_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_pulses
    ADD CONSTRAINT governance_pulses_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: governance_pulses governance_pulses_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_pulses
    ADD CONSTRAINT governance_pulses_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;


--
-- Name: governance_pulses governance_pulses_locked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_pulses
    ADD CONSTRAINT governance_pulses_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.users(id);


--
-- Name: governance_pulses governance_pulses_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_pulses
    ADD CONSTRAINT governance_pulses_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: governance_pulses governance_pulses_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_pulses
    ADD CONSTRAINT governance_pulses_submitted_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: governance_questions governance_questions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_questions
    ADD CONSTRAINT governance_questions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: governance_questions governance_questions_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_questions
    ADD CONSTRAINT governance_questions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.governance_templates(id) ON DELETE CASCADE;


--
-- Name: governance_schedules governance_schedules_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_schedules
    ADD CONSTRAINT governance_schedules_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: governance_templates governance_templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_templates
    ADD CONSTRAINT governance_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: governance_templates governance_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_templates
    ADD CONSTRAINT governance_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: house_settings house_settings_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.house_settings
    ADD CONSTRAINT house_settings_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;


--
-- Name: houses houses_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.houses
    ADD CONSTRAINT houses_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: houses houses_deputy_rm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.houses
    ADD CONSTRAINT houses_deputy_rm_id_fkey FOREIGN KEY (deputy_rm_id) REFERENCES public.users(id);


--
-- Name: houses houses_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.houses
    ADD CONSTRAINT houses_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: houses houses_primary_rm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.houses
    ADD CONSTRAINT houses_primary_rm_id_fkey FOREIGN KEY (primary_rm_id) REFERENCES public.users(id);


--
-- Name: incident_attachments incident_attachments_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_attachments
    ADD CONSTRAINT incident_attachments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: incident_attachments incident_attachments_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_attachments
    ADD CONSTRAINT incident_attachments_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON DELETE CASCADE;


--
-- Name: incident_attachments incident_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_attachments
    ADD CONSTRAINT incident_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: incident_categories incident_categories_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_categories
    ADD CONSTRAINT incident_categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: incident_escalations incident_escalations_escalation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_escalations
    ADD CONSTRAINT incident_escalations_escalation_id_fkey FOREIGN KEY (escalation_id) REFERENCES public.escalations(id) ON DELETE CASCADE;


--
-- Name: incident_escalations incident_escalations_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_escalations
    ADD CONSTRAINT incident_escalations_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON DELETE CASCADE;


--
-- Name: incident_events incident_events_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_events
    ADD CONSTRAINT incident_events_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: incident_events incident_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_events
    ADD CONSTRAINT incident_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: incident_events incident_events_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_events
    ADD CONSTRAINT incident_events_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON DELETE CASCADE;


--
-- Name: incident_reconstruction incident_reconstruction_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstruction
    ADD CONSTRAINT incident_reconstruction_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: incident_reconstruction incident_reconstruction_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstruction
    ADD CONSTRAINT incident_reconstruction_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: incident_reconstruction incident_reconstruction_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstruction
    ADD CONSTRAINT incident_reconstruction_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id);


--
-- Name: incident_reconstruction incident_reconstruction_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstruction
    ADD CONSTRAINT incident_reconstruction_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;


--
-- Name: incident_reconstruction incident_reconstruction_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstruction
    ADD CONSTRAINT incident_reconstruction_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON DELETE CASCADE;


--
-- Name: incident_reconstruction incident_reconstruction_lead_investigator_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstruction
    ADD CONSTRAINT incident_reconstruction_lead_investigator_fkey FOREIGN KEY (lead_investigator) REFERENCES public.users(id);


--
-- Name: incident_reconstruction_pulses incident_reconstruction_pulses_pulse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstruction_pulses
    ADD CONSTRAINT incident_reconstruction_pulses_pulse_id_fkey FOREIGN KEY (pulse_id) REFERENCES public.governance_pulses(id) ON DELETE CASCADE;


--
-- Name: incident_reconstruction_pulses incident_reconstruction_pulses_reconstruction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstruction_pulses
    ADD CONSTRAINT incident_reconstruction_pulses_reconstruction_id_fkey FOREIGN KEY (reconstruction_id) REFERENCES public.incident_reconstruction(id) ON DELETE CASCADE;


--
-- Name: incident_reconstructions incident_reconstructions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstructions
    ADD CONSTRAINT incident_reconstructions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: incident_reconstructions incident_reconstructions_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstructions
    ADD CONSTRAINT incident_reconstructions_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id);


--
-- Name: incident_reconstructions incident_reconstructions_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstructions
    ADD CONSTRAINT incident_reconstructions_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id);


--
-- Name: incident_reconstructions incident_reconstructions_locked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstructions
    ADD CONSTRAINT incident_reconstructions_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.users(id);


--
-- Name: incident_reconstructions incident_reconstructions_service_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reconstructions
    ADD CONSTRAINT incident_reconstructions_service_unit_id_fkey FOREIGN KEY (service_unit_id) REFERENCES public.houses(id);


--
-- Name: incident_risks incident_risks_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_risks
    ADD CONSTRAINT incident_risks_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON DELETE CASCADE;


--
-- Name: incident_risks incident_risks_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_risks
    ADD CONSTRAINT incident_risks_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id) ON DELETE CASCADE;


--
-- Name: incidents incidents_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: incidents incidents_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.incident_categories(id) ON DELETE SET NULL;


--
-- Name: incidents incidents_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: incidents incidents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: incidents incidents_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;


--
-- Name: job_logs job_logs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_logs
    ADD CONSTRAINT job_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: monthly_board_reports monthly_board_reports_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_board_reports
    ADD CONSTRAINT monthly_board_reports_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: monthly_board_reports monthly_board_reports_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_board_reports
    ADD CONSTRAINT monthly_board_reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: monthly_reports monthly_reports_co_signed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_reports
    ADD CONSTRAINT monthly_reports_co_signed_by_fkey FOREIGN KEY (co_signed_by) REFERENCES public.users(id);


--
-- Name: monthly_reports monthly_reports_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_reports
    ADD CONSTRAINT monthly_reports_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: monthly_reports monthly_reports_locked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_reports
    ADD CONSTRAINT monthly_reports_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.users(id);


--
-- Name: monthly_reports monthly_reports_signed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_reports
    ADD CONSTRAINT monthly_reports_signed_by_fkey FOREIGN KEY (signed_by) REFERENCES public.users(id);


--
-- Name: notification_preferences notification_preferences_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pulse_risk_links pulse_risk_links_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pulse_risk_links
    ADD CONSTRAINT pulse_risk_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: pulse_risk_links pulse_risk_links_pulse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pulse_risk_links
    ADD CONSTRAINT pulse_risk_links_pulse_id_fkey FOREIGN KEY (pulse_id) REFERENCES public.governance_pulses(id);


--
-- Name: report_cache report_cache_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_cache
    ADD CONSTRAINT report_cache_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: report_exports report_exports_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT report_exports_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: report_exports report_exports_downloaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT report_exports_downloaded_by_fkey FOREIGN KEY (downloaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: report_exports report_exports_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT report_exports_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: report_requests report_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_requests
    ADD CONSTRAINT report_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: report_requests report_requests_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_requests
    ADD CONSTRAINT report_requests_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE SET NULL;


--
-- Name: report_requests report_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_requests
    ADD CONSTRAINT report_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: reports reports_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: reports reports_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: ri_acknowledgements ri_acknowledgements_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ri_acknowledgements
    ADD CONSTRAINT ri_acknowledgements_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON DELETE CASCADE;


--
-- Name: ri_acknowledgements ri_acknowledgements_ri_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ri_acknowledgements
    ADD CONSTRAINT ri_acknowledgements_ri_user_id_fkey FOREIGN KEY (ri_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: ri_queries ri_queries_ri_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ri_queries
    ADD CONSTRAINT ri_queries_ri_user_id_fkey FOREIGN KEY (ri_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: ri_queries ri_queries_rm_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ri_queries
    ADD CONSTRAINT ri_queries_rm_user_id_fkey FOREIGN KEY (rm_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ri_queries ri_queries_weekly_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ri_queries
    ADD CONSTRAINT ri_queries_weekly_review_id_fkey FOREIGN KEY (weekly_review_id) REFERENCES public.weekly_reviews(id) ON DELETE CASCADE;


--
-- Name: risk_actions risk_actions_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_actions
    ADD CONSTRAINT risk_actions_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: risk_actions risk_actions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_actions
    ADD CONSTRAINT risk_actions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: risk_actions risk_actions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_actions
    ADD CONSTRAINT risk_actions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: risk_actions risk_actions_effectiveness_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_actions
    ADD CONSTRAINT risk_actions_effectiveness_reviewed_by_fkey FOREIGN KEY (effectiveness_reviewed_by) REFERENCES public.users(id);


--
-- Name: risk_actions risk_actions_linked_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_actions
    ADD CONSTRAINT risk_actions_linked_review_id_fkey FOREIGN KEY (linked_review_id) REFERENCES public.weekly_reviews(id) ON DELETE SET NULL;


--
-- Name: risk_actions risk_actions_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_actions
    ADD CONSTRAINT risk_actions_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id) ON DELETE CASCADE;


--
-- Name: risk_actions risk_actions_verified_by_ri_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_actions
    ADD CONSTRAINT risk_actions_verified_by_ri_fkey FOREIGN KEY (verified_by_ri) REFERENCES public.users(id);


--
-- Name: risk_actions risk_actions_verified_by_rm_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_actions
    ADD CONSTRAINT risk_actions_verified_by_rm_fkey FOREIGN KEY (verified_by_rm) REFERENCES public.users(id);


--
-- Name: risk_attachments risk_attachments_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_attachments
    ADD CONSTRAINT risk_attachments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: risk_attachments risk_attachments_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_attachments
    ADD CONSTRAINT risk_attachments_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id) ON DELETE CASCADE;


--
-- Name: risk_attachments risk_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_attachments
    ADD CONSTRAINT risk_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: risk_candidates risk_candidates_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_candidates
    ADD CONSTRAINT risk_candidates_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.signal_clusters(id) ON DELETE CASCADE;


--
-- Name: risk_candidates risk_candidates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_candidates
    ADD CONSTRAINT risk_candidates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: risk_candidates risk_candidates_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_candidates
    ADD CONSTRAINT risk_candidates_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;


--
-- Name: risk_candidates risk_candidates_linked_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_candidates
    ADD CONSTRAINT risk_candidates_linked_risk_id_fkey FOREIGN KEY (linked_risk_id) REFERENCES public.risks(id) ON DELETE SET NULL;


--
-- Name: risk_categories risk_categories_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_categories
    ADD CONSTRAINT risk_categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: risk_events risk_events_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_events
    ADD CONSTRAINT risk_events_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: risk_events risk_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_events
    ADD CONSTRAINT risk_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: risk_events risk_events_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_events
    ADD CONSTRAINT risk_events_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id) ON DELETE CASCADE;


--
-- Name: risk_signal_links risk_signal_links_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_signal_links
    ADD CONSTRAINT risk_signal_links_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.signal_clusters(id) ON DELETE SET NULL;


--
-- Name: risk_signal_links risk_signal_links_linked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_signal_links
    ADD CONSTRAINT risk_signal_links_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES public.users(id);


--
-- Name: risk_signal_links risk_signal_links_pulse_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_signal_links
    ADD CONSTRAINT risk_signal_links_pulse_entry_id_fkey FOREIGN KEY (pulse_entry_id) REFERENCES public.governance_pulses(id) ON DELETE CASCADE;


--
-- Name: risks risks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: risks risks_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.risk_categories(id) ON DELETE SET NULL;


--
-- Name: risks risks_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: risks risks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: risks risks_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;


--
-- Name: risks risks_source_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_source_cluster_id_fkey FOREIGN KEY (source_cluster_id) REFERENCES public.signal_clusters(id) ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: signal_clusters signal_clusters_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.signal_clusters
    ADD CONSTRAINT signal_clusters_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: signal_clusters signal_clusters_dismissed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.signal_clusters
    ADD CONSTRAINT signal_clusters_dismissed_by_fkey FOREIGN KEY (dismissed_by) REFERENCES public.users(id);


--
-- Name: signal_clusters signal_clusters_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.signal_clusters
    ADD CONSTRAINT signal_clusters_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;


--
-- Name: signal_clusters signal_clusters_linked_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.signal_clusters
    ADD CONSTRAINT signal_clusters_linked_risk_id_fkey FOREIGN KEY (linked_risk_id) REFERENCES public.risks(id) ON DELETE SET NULL;


--
-- Name: system_prompts system_prompts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_prompts
    ADD CONSTRAINT system_prompts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: system_prompts system_prompts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_prompts
    ADD CONSTRAINT system_prompts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: system_settings system_settings_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: threshold_events threshold_events_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.threshold_events
    ADD CONSTRAINT threshold_events_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.users(id);


--
-- Name: threshold_events threshold_events_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.threshold_events
    ADD CONSTRAINT threshold_events_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.signal_clusters(id) ON DELETE CASCADE;


--
-- Name: threshold_events threshold_events_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.threshold_events
    ADD CONSTRAINT threshold_events_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: threshold_events threshold_events_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.threshold_events
    ADD CONSTRAINT threshold_events_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;


--
-- Name: threshold_events threshold_events_pulse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.threshold_events
    ADD CONSTRAINT threshold_events_pulse_id_fkey FOREIGN KEY (pulse_id) REFERENCES public.governance_pulses(id) ON DELETE CASCADE;


--
-- Name: trend_metrics trend_metrics_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trend_metrics
    ADD CONSTRAINT trend_metrics_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: trend_metrics trend_metrics_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trend_metrics
    ADD CONSTRAINT trend_metrics_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE SET NULL;


--
-- Name: user_houses user_houses_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_houses
    ADD CONSTRAINT user_houses_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: user_houses user_houses_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_houses
    ADD CONSTRAINT user_houses_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;


--
-- Name: user_houses user_houses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_houses
    ADD CONSTRAINT user_houses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_service_units user_service_units_service_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_service_units
    ADD CONSTRAINT user_service_units_service_unit_id_fkey FOREIGN KEY (service_unit_id) REFERENCES public.houses(id);


--
-- Name: user_service_units user_service_units_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_service_units
    ADD CONSTRAINT user_service_units_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: websocket_sessions websocket_sessions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.websocket_sessions
    ADD CONSTRAINT websocket_sessions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: websocket_sessions websocket_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.websocket_sessions
    ADD CONSTRAINT websocket_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: weekly_reviews weekly_reviews_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_reviews
    ADD CONSTRAINT weekly_reviews_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: weekly_reviews weekly_reviews_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_reviews
    ADD CONSTRAINT weekly_reviews_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: weekly_reviews weekly_reviews_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_reviews
    ADD CONSTRAINT weekly_reviews_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id);


--
-- Name: service_governance_compliance_mv; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: postgres
--

REFRESH MATERIALIZED VIEW public.service_governance_compliance_mv;


--
-- Name: service_unit_stability; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: postgres
--

REFRESH MATERIALIZED VIEW public.service_unit_stability;


--
-- PostgreSQL database dump complete
--

\unrestrict 9Sy5TjZtUXNaMIRXuRIuXsLgtWZOTJzOXd6Pypzu0bLqJwK4nA8zGvpINQLm8px

