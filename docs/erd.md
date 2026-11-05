```mermaid
erDiagram
    USERS {
        uuid id PK
        text email UK
        text display_name
        text role
        timestamptz created_at
    }

    IDENTITIES {
        uuid id PK
        uuid user_id FK
        text provider
        text provider_user_id
        timestamptz created_at
    }

    PC_BUILDS {
        uuid id PK
        uuid user_id FK
        text name
        timestamptz created_at
    }

    CATALOG_PARTS {
        uuid id PK
        text category
        text name
        numeric price
        timestamptz created_at
    }

    BUILD_PARTS {
        uuid id PK
        uuid build_id FK
        uuid catalog_part_id FK
        integer quantity
    }

    CPU_DETAILS {
        uuid part_id PK, FK
        integer core_count
        numeric core_clock
        numeric boost_clock
        text microarchitecture
        integer tdp
        text graphics
    }

    CPU_COOLER_DETAILS {
        uuid part_id PK, FK
        jsonb rpm
        jsonb noise_level
        text color
        numeric size
    }

    MOTHERBOARD_DETAILS {
        uuid part_id PK, FK
        text socket
        text form_factor
        integer max_memory
        integer memory_slots
        text color
    }

    MEMORY_DETAILS {
        uuid part_id PK, FK
        jsonb speed
        jsonb modules
        numeric price_per_gb
        text color
        numeric first_word_latency
        numeric cas_latency
    }

    INTERNAL_HARD_DRIVE_DETAILS {
        uuid part_id PK, FK
        numeric capacity
        numeric price_per_gb
        text type
        numeric cache
        text form_factor
        text interface
    }

    VIDEO_CARD_DETAILS {
        uuid part_id PK, FK
        text chipset
        numeric memory
        numeric core_clock
        numeric boost_clock
        text color
        numeric length
    }

    CASE_DETAILS {
        uuid part_id PK, FK
        text type
        text color
        numeric included_psu_w
        text side_panel
        numeric external_volume
        integer internal_35_bays
    }

    POWER_SUPPLY_DETAILS {
        uuid part_id PK, FK
        text type
        text efficiency
        integer wattage
        text modular
        text color
    }

    CASE_ACCESSORY_DETAILS {
        uuid part_id PK, FK
        text type
        numeric form_factor
    }

    CASE_FAN_DETAILS {
        uuid part_id PK, FK
        numeric size
        text color
        text rpm
        text airflow
        text noise_level
        boolean pwm
    }

    EXTERNAL_HARD_DRIVE_DETAILS {
        uuid part_id PK, FK
        text type
        text interface
        numeric capacity
        numeric price_per_gb
        text color
    }

    FAN_CONTROLLER_DETAILS {
        uuid part_id PK, FK
        numeric channels
        numeric channel_wattage
        boolean pwm
        text form_factor
        text color
    }

    HEADPHONES_DETAILS {
        uuid part_id PK, FK
        text type
        text frequency_response
        boolean microphone
        boolean wireless
        text enclosure_type
        text color
    }

    KEYBOARD_DETAILS {
        uuid part_id PK, FK
        text style
        text switches
        text backlit
        boolean tenkeyless
        text connection_type
        text color
    }

    MONITOR_DETAILS {
        uuid part_id PK, FK
        numeric screen_size
        text resolution
        numeric refresh_rate
        numeric response_time
        text panel_type
        text aspect_ratio
    }

    MOUSE_DETAILS {
        uuid part_id PK, FK
        text tracking_method
        text connection_type
        numeric max_dpi
        text hand_orientation
        text color
    }

    OPTICAL_DRIVE_DETAILS {
        uuid part_id PK, FK
        numeric bd
        numeric dvd
        numeric cd
        text bd_write
        text dvd_write
        text cd_write
    }

    OS_DETAILS {
        uuid part_id PK, FK
        text mode
        numeric max_memory
    }

    SOUND_CARD_DETAILS {
        uuid part_id PK, FK
        numeric channels
        numeric digital_audio
        numeric snr
        numeric sample_rate
        text chipset
        text interface
    }

    SPEAKERS_DETAILS {
        uuid part_id PK, FK
        numeric configuration
        numeric wattage
        text frequency_response
        text color
    }

    THERMAL_PASTE_DETAILS {
        uuid part_id PK, FK
        numeric amount
    }

    UPS_DETAILS {
        uuid part_id PK, FK
        numeric capacity_w
        numeric capacity_va
    }

    WEBCAM_DETAILS {
        uuid part_id PK, FK
        text resolutions
        text connection
        text focus_type
        text os
        numeric fov
    }

    WIRED_NETWORK_CARD_DETAILS {
        uuid part_id PK, FK
        text interface
        text color
    }

    WIRELESS_NETWORK_CARD_DETAILS {
        uuid part_id PK, FK
        text protocol
        text interface
        text color
    }

    USERS ||--o{ IDENTITIES : has
    USERS ||--o{ PC_BUILDS : owns
    PC_BUILDS ||--o{ BUILD_PARTS : contains
    CATALOG_PARTS ||--o{ BUILD_PARTS : selected_as

    CATALOG_PARTS ||--o| CPU_DETAILS : has
    CATALOG_PARTS ||--o| CPU_COOLER_DETAILS : has
    CATALOG_PARTS ||--o| MOTHERBOARD_DETAILS : has
    CATALOG_PARTS ||--o| MEMORY_DETAILS : has
    CATALOG_PARTS ||--o| INTERNAL_HARD_DRIVE_DETAILS : has
    CATALOG_PARTS ||--o| VIDEO_CARD_DETAILS : has
    CATALOG_PARTS ||--o| CASE_DETAILS : has
    CATALOG_PARTS ||--o| POWER_SUPPLY_DETAILS : has
    CATALOG_PARTS ||--o| CASE_ACCESSORY_DETAILS : has
    CATALOG_PARTS ||--o| CASE_FAN_DETAILS : has
    CATALOG_PARTS ||--o| EXTERNAL_HARD_DRIVE_DETAILS : has
    CATALOG_PARTS ||--o| FAN_CONTROLLER_DETAILS : has
    CATALOG_PARTS ||--o| HEADPHONES_DETAILS : has
    CATALOG_PARTS ||--o| KEYBOARD_DETAILS : has
    CATALOG_PARTS ||--o| MONITOR_DETAILS : has
    CATALOG_PARTS ||--o| MOUSE_DETAILS : has
    CATALOG_PARTS ||--o| OPTICAL_DRIVE_DETAILS : has
    CATALOG_PARTS ||--o| OS_DETAILS : has
    CATALOG_PARTS ||--o| SOUND_CARD_DETAILS : has
    CATALOG_PARTS ||--o| SPEAKERS_DETAILS : has
    CATALOG_PARTS ||--o| THERMAL_PASTE_DETAILS : has
    CATALOG_PARTS ||--o| UPS_DETAILS : has
    CATALOG_PARTS ||--o| WEBCAM_DETAILS : has
    CATALOG_PARTS ||--o| WIRED_NETWORK_CARD_DETAILS : has
    CATALOG_PARTS ||--o| WIRELESS_NETWORK_CARD_DETAILS : has
```
