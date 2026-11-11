--
-- PostgreSQL database dump
--

-- Dumped from database version 17.11
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: build_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.build_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    build_id uuid NOT NULL,
    catalog_part_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    CONSTRAINT build_parts_quantity_check CHECK ((quantity > 0))
);


--
-- Name: case_accessory_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_accessory_details (
    part_id uuid NOT NULL,
    type text,
    form_factor numeric
);


--
-- Name: case_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_details (
    part_id uuid NOT NULL,
    type text,
    color text,
    included_psu_w numeric,
    side_panel text,
    external_volume numeric,
    internal_35_bays integer
);


--
-- Name: case_fan_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_fan_details (
    part_id uuid NOT NULL,
    size numeric,
    color text,
    rpm text,
    airflow text,
    noise_level text,
    pwm boolean
);


--
-- Name: catalog_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text NOT NULL,
    name text NOT NULL,
    price numeric(10,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT catalog_parts_category_check CHECK ((category = ANY (ARRAY['case-accessory'::text, 'case-fan'::text, 'case'::text, 'cpu-cooler'::text, 'cpu'::text, 'external-hard-drive'::text, 'fan-controller'::text, 'headphones'::text, 'internal-hard-drive'::text, 'keyboard'::text, 'memory'::text, 'monitor'::text, 'motherboard'::text, 'mouse'::text, 'optical-drive'::text, 'os'::text, 'power-supply'::text, 'sound-card'::text, 'speakers'::text, 'thermal-paste'::text, 'ups'::text, 'video-card'::text, 'webcam'::text, 'wired-network-card'::text, 'wireless-network-card'::text])))
);


--
-- Name: cpu_cooler_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cpu_cooler_details (
    part_id uuid NOT NULL,
    rpm jsonb,
    noise_level jsonb,
    color text,
    size numeric
);


--
-- Name: cpu_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cpu_details (
    part_id uuid NOT NULL,
    core_count integer,
    core_clock numeric,
    boost_clock numeric,
    microarchitecture text,
    tdp integer,
    graphics text
);


--
-- Name: external_hard_drive_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_hard_drive_details (
    part_id uuid NOT NULL,
    type text,
    interface text,
    capacity numeric,
    price_per_gb numeric,
    color text
);


--
-- Name: fan_controller_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fan_controller_details (
    part_id uuid NOT NULL,
    channels numeric,
    channel_wattage numeric,
    pwm boolean,
    form_factor text,
    color text
);


--
-- Name: headphones_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.headphones_details (
    part_id uuid NOT NULL,
    type text,
    frequency_response text,
    microphone boolean,
    wireless boolean,
    enclosure_type text,
    color text
);


--
-- Name: identities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    provider_user_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: internal_hard_drive_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.internal_hard_drive_details (
    part_id uuid NOT NULL,
    capacity numeric,
    price_per_gb numeric(10,3),
    type text,
    cache numeric,
    form_factor text,
    interface text
);


--
-- Name: keyboard_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyboard_details (
    part_id uuid NOT NULL,
    style text,
    switches text,
    backlit text,
    tenkeyless boolean,
    connection_type text,
    color text
);


--
-- Name: memory_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memory_details (
    part_id uuid NOT NULL,
    speed jsonb,
    modules jsonb,
    price_per_gb numeric(10,3),
    color text,
    first_word_latency numeric,
    cas_latency numeric
);


--
-- Name: monitor_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monitor_details (
    part_id uuid NOT NULL,
    screen_size numeric,
    resolution text,
    refresh_rate numeric,
    response_time numeric,
    panel_type text,
    aspect_ratio text
);


--
-- Name: motherboard_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.motherboard_details (
    part_id uuid NOT NULL,
    socket text,
    form_factor text,
    max_memory integer,
    memory_slots integer,
    color text
);


--
-- Name: mouse_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mouse_details (
    part_id uuid NOT NULL,
    tracking_method text,
    connection_type text,
    max_dpi numeric,
    hand_orientation text,
    color text
);


--
-- Name: optical_drive_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.optical_drive_details (
    part_id uuid NOT NULL,
    bd numeric,
    dvd numeric,
    cd numeric,
    bd_write text,
    dvd_write text,
    cd_write text
);


--
-- Name: os_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.os_details (
    part_id uuid NOT NULL,
    mode text,
    max_memory numeric
);


--
-- Name: pc_builds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_builds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: power_supply_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.power_supply_details (
    part_id uuid NOT NULL,
    type text,
    efficiency text,
    wattage integer,
    modular text,
    color text
);


--
-- Name: sound_card_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sound_card_details (
    part_id uuid NOT NULL,
    channels numeric,
    digital_audio numeric,
    snr numeric,
    sample_rate numeric,
    chipset text,
    interface text
);


--
-- Name: speakers_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.speakers_details (
    part_id uuid NOT NULL,
    configuration numeric,
    wattage numeric,
    frequency_response text,
    color text
);


--
-- Name: thermal_paste_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thermal_paste_details (
    part_id uuid NOT NULL,
    amount numeric
);


--
-- Name: ups_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ups_details (
    part_id uuid NOT NULL,
    capacity_w numeric,
    capacity_va numeric
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    display_name text,
    role text DEFAULT 'USER'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: video_card_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_card_details (
    part_id uuid NOT NULL,
    chipset text,
    memory numeric,
    core_clock numeric,
    boost_clock numeric,
    color text,
    length numeric
);


--
-- Name: webcam_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webcam_details (
    part_id uuid NOT NULL,
    resolutions text,
    connection text,
    focus_type text,
    os text,
    fov numeric
);


--
-- Name: wired_network_card_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wired_network_card_details (
    part_id uuid NOT NULL,
    interface text,
    color text
);


--
-- Name: wireless_network_card_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wireless_network_card_details (
    part_id uuid NOT NULL,
    protocol text,
    interface text,
    color text
);


--
-- Name: build_parts build_parts_build_id_catalog_part_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_parts
    ADD CONSTRAINT build_parts_build_id_catalog_part_id_key UNIQUE (build_id, catalog_part_id);


--
-- Name: build_parts build_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_parts
    ADD CONSTRAINT build_parts_pkey PRIMARY KEY (id);


--
-- Name: case_accessory_details case_accessory_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_accessory_details
    ADD CONSTRAINT case_accessory_details_pkey PRIMARY KEY (part_id);


--
-- Name: case_details case_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_details
    ADD CONSTRAINT case_details_pkey PRIMARY KEY (part_id);


--
-- Name: case_fan_details case_fan_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_fan_details
    ADD CONSTRAINT case_fan_details_pkey PRIMARY KEY (part_id);


--
-- Name: catalog_parts catalog_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_parts
    ADD CONSTRAINT catalog_parts_pkey PRIMARY KEY (id);


--
-- Name: cpu_cooler_details cpu_cooler_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cpu_cooler_details
    ADD CONSTRAINT cpu_cooler_details_pkey PRIMARY KEY (part_id);


--
-- Name: cpu_details cpu_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cpu_details
    ADD CONSTRAINT cpu_details_pkey PRIMARY KEY (part_id);


--
-- Name: external_hard_drive_details external_hard_drive_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_hard_drive_details
    ADD CONSTRAINT external_hard_drive_details_pkey PRIMARY KEY (part_id);


--
-- Name: fan_controller_details fan_controller_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fan_controller_details
    ADD CONSTRAINT fan_controller_details_pkey PRIMARY KEY (part_id);


--
-- Name: headphones_details headphones_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.headphones_details
    ADD CONSTRAINT headphones_details_pkey PRIMARY KEY (part_id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_provider_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identities
    ADD CONSTRAINT identities_provider_provider_user_id_key UNIQUE (provider, provider_user_id);


--
-- Name: internal_hard_drive_details internal_hard_drive_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_hard_drive_details
    ADD CONSTRAINT internal_hard_drive_details_pkey PRIMARY KEY (part_id);


--
-- Name: keyboard_details keyboard_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyboard_details
    ADD CONSTRAINT keyboard_details_pkey PRIMARY KEY (part_id);


--
-- Name: memory_details memory_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memory_details
    ADD CONSTRAINT memory_details_pkey PRIMARY KEY (part_id);


--
-- Name: monitor_details monitor_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_details
    ADD CONSTRAINT monitor_details_pkey PRIMARY KEY (part_id);


--
-- Name: motherboard_details motherboard_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motherboard_details
    ADD CONSTRAINT motherboard_details_pkey PRIMARY KEY (part_id);


--
-- Name: mouse_details mouse_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mouse_details
    ADD CONSTRAINT mouse_details_pkey PRIMARY KEY (part_id);


--
-- Name: optical_drive_details optical_drive_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optical_drive_details
    ADD CONSTRAINT optical_drive_details_pkey PRIMARY KEY (part_id);


--
-- Name: os_details os_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.os_details
    ADD CONSTRAINT os_details_pkey PRIMARY KEY (part_id);


--
-- Name: pc_builds pc_builds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_builds
    ADD CONSTRAINT pc_builds_pkey PRIMARY KEY (id);


--
-- Name: power_supply_details power_supply_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.power_supply_details
    ADD CONSTRAINT power_supply_details_pkey PRIMARY KEY (part_id);


--
-- Name: sound_card_details sound_card_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sound_card_details
    ADD CONSTRAINT sound_card_details_pkey PRIMARY KEY (part_id);


--
-- Name: speakers_details speakers_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speakers_details
    ADD CONSTRAINT speakers_details_pkey PRIMARY KEY (part_id);


--
-- Name: thermal_paste_details thermal_paste_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thermal_paste_details
    ADD CONSTRAINT thermal_paste_details_pkey PRIMARY KEY (part_id);


--
-- Name: ups_details ups_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ups_details
    ADD CONSTRAINT ups_details_pkey PRIMARY KEY (part_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: video_card_details video_card_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_card_details
    ADD CONSTRAINT video_card_details_pkey PRIMARY KEY (part_id);


--
-- Name: webcam_details webcam_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webcam_details
    ADD CONSTRAINT webcam_details_pkey PRIMARY KEY (part_id);


--
-- Name: wired_network_card_details wired_network_card_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wired_network_card_details
    ADD CONSTRAINT wired_network_card_details_pkey PRIMARY KEY (part_id);


--
-- Name: wireless_network_card_details wireless_network_card_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wireless_network_card_details
    ADD CONSTRAINT wireless_network_card_details_pkey PRIMARY KEY (part_id);


--
-- Name: build_parts_build_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX build_parts_build_id_idx ON public.build_parts USING btree (build_id);


--
-- Name: build_parts_catalog_part_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX build_parts_catalog_part_id_idx ON public.build_parts USING btree (catalog_part_id);


--
-- Name: catalog_parts_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX catalog_parts_category_idx ON public.catalog_parts USING btree (category);


--
-- Name: pc_builds_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pc_builds_user_id_idx ON public.pc_builds USING btree (user_id);


--
-- Name: build_parts build_parts_build_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_parts
    ADD CONSTRAINT build_parts_build_id_fkey FOREIGN KEY (build_id) REFERENCES public.pc_builds(id) ON DELETE CASCADE;


--
-- Name: build_parts build_parts_catalog_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_parts
    ADD CONSTRAINT build_parts_catalog_part_id_fkey FOREIGN KEY (catalog_part_id) REFERENCES public.catalog_parts(id);


--
-- Name: case_accessory_details case_accessory_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_accessory_details
    ADD CONSTRAINT case_accessory_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: case_details case_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_details
    ADD CONSTRAINT case_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id) ON DELETE CASCADE;


--
-- Name: case_fan_details case_fan_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_fan_details
    ADD CONSTRAINT case_fan_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: cpu_cooler_details cpu_cooler_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cpu_cooler_details
    ADD CONSTRAINT cpu_cooler_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id) ON DELETE CASCADE;


--
-- Name: cpu_details cpu_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cpu_details
    ADD CONSTRAINT cpu_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id) ON DELETE CASCADE;


--
-- Name: external_hard_drive_details external_hard_drive_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_hard_drive_details
    ADD CONSTRAINT external_hard_drive_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: fan_controller_details fan_controller_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fan_controller_details
    ADD CONSTRAINT fan_controller_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: headphones_details headphones_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.headphones_details
    ADD CONSTRAINT headphones_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: internal_hard_drive_details internal_hard_drive_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_hard_drive_details
    ADD CONSTRAINT internal_hard_drive_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id) ON DELETE CASCADE;


--
-- Name: keyboard_details keyboard_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyboard_details
    ADD CONSTRAINT keyboard_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: memory_details memory_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memory_details
    ADD CONSTRAINT memory_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id) ON DELETE CASCADE;


--
-- Name: monitor_details monitor_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_details
    ADD CONSTRAINT monitor_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: motherboard_details motherboard_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motherboard_details
    ADD CONSTRAINT motherboard_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id) ON DELETE CASCADE;


--
-- Name: mouse_details mouse_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mouse_details
    ADD CONSTRAINT mouse_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: optical_drive_details optical_drive_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optical_drive_details
    ADD CONSTRAINT optical_drive_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: os_details os_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.os_details
    ADD CONSTRAINT os_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: pc_builds pc_builds_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_builds
    ADD CONSTRAINT pc_builds_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: power_supply_details power_supply_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.power_supply_details
    ADD CONSTRAINT power_supply_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id) ON DELETE CASCADE;


--
-- Name: sound_card_details sound_card_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sound_card_details
    ADD CONSTRAINT sound_card_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: speakers_details speakers_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speakers_details
    ADD CONSTRAINT speakers_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: thermal_paste_details thermal_paste_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thermal_paste_details
    ADD CONSTRAINT thermal_paste_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: ups_details ups_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ups_details
    ADD CONSTRAINT ups_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: video_card_details video_card_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_card_details
    ADD CONSTRAINT video_card_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id) ON DELETE CASCADE;


--
-- Name: webcam_details webcam_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webcam_details
    ADD CONSTRAINT webcam_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: wired_network_card_details wired_network_card_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wired_network_card_details
    ADD CONSTRAINT wired_network_card_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: wireless_network_card_details wireless_network_card_details_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wireless_network_card_details
    ADD CONSTRAINT wireless_network_card_details_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.catalog_parts(id);


--
-- Name: build_parts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.build_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: case_accessory_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.case_accessory_details ENABLE ROW LEVEL SECURITY;

--
-- Name: case_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.case_details ENABLE ROW LEVEL SECURITY;

--
-- Name: case_fan_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.case_fan_details ENABLE ROW LEVEL SECURITY;

--
-- Name: catalog_parts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.catalog_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: cpu_cooler_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cpu_cooler_details ENABLE ROW LEVEL SECURITY;

--
-- Name: cpu_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cpu_details ENABLE ROW LEVEL SECURITY;

--
-- Name: external_hard_drive_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.external_hard_drive_details ENABLE ROW LEVEL SECURITY;

--
-- Name: fan_controller_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fan_controller_details ENABLE ROW LEVEL SECURITY;

--
-- Name: headphones_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.headphones_details ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: internal_hard_drive_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.internal_hard_drive_details ENABLE ROW LEVEL SECURITY;

--
-- Name: keyboard_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.keyboard_details ENABLE ROW LEVEL SECURITY;

--
-- Name: memory_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.memory_details ENABLE ROW LEVEL SECURITY;

--
-- Name: monitor_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monitor_details ENABLE ROW LEVEL SECURITY;

--
-- Name: motherboard_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.motherboard_details ENABLE ROW LEVEL SECURITY;

--
-- Name: mouse_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mouse_details ENABLE ROW LEVEL SECURITY;

--
-- Name: optical_drive_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.optical_drive_details ENABLE ROW LEVEL SECURITY;

--
-- Name: os_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.os_details ENABLE ROW LEVEL SECURITY;

--
-- Name: pc_builds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pc_builds ENABLE ROW LEVEL SECURITY;

--
-- Name: power_supply_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.power_supply_details ENABLE ROW LEVEL SECURITY;

--
-- Name: sound_card_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sound_card_details ENABLE ROW LEVEL SECURITY;

--
-- Name: speakers_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.speakers_details ENABLE ROW LEVEL SECURITY;

--
-- Name: thermal_paste_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.thermal_paste_details ENABLE ROW LEVEL SECURITY;

--
-- Name: ups_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ups_details ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: video_card_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_card_details ENABLE ROW LEVEL SECURITY;

--
-- Name: webcam_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webcam_details ENABLE ROW LEVEL SECURITY;

--
-- Name: wired_network_card_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wired_network_card_details ENABLE ROW LEVEL SECURITY;

--
-- Name: wireless_network_card_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wireless_network_card_details ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

