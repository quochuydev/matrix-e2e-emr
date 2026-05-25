# Matrix Patient Records

End-to-end encrypted patient records built on top of Matrix. Each patient is a
private encrypted room; profile data lives in an `m.thread`, messages live in
the room timeline.

## Architecture

```mermaid
%%{init: {'theme':'base', 'themeVariables': {'background':'#ffffff','primaryTextColor':'#1f2937','lineColor':'#9ca3af','clusterBkg':'#ffffff','clusterBorder':'#ffffff'}}}%%

flowchart LR
    subgraph App["E2EE with matrix.org"]
        direction LR

        subgraph ClinicPOV["Practice software"]
            direction TB
            Clinic(["Clinic"]):::actor
        end

        subgraph PatientPOV["Patient app"]
            direction TB
            Patient(["Patient<br/>own account"]):::actor
        end

        subgraph BrowserZone["Browser session"]
            direction TB

            subgraph Gate["MatrixProvider"]
                direction TB
                SignIn["Sign-in<br/>username + password"]:::command
                RecoveryKey["Enter recovery key"]:::command
                Ready["Session ready"]:::event
                SignIn --> RecoveryKey
                RecoveryKey --> Ready
            end

            subgraph Sdk["matrix-js-sdk<br/>@pumped-fn/lite-react"]
                direction TB
                Crypto["End-to-end encryption"]:::policy
            end

            subgraph ClinicFeatures["Clinic features"]
                direction TB
                PatientCRUD["Patient CRUD<br/>Create/Update encrypted rooms"]:::command
                ClinicMsg["Message patient"]:::command
                SendInvite["Invite patient to room"]:::command
            end

            subgraph PatientFeatures["Patient features"]
                direction TB
                ViewHolders["Get connected clinics"]:::command
                ReadMsg["Read clinic messages"]:::command
                RespondInvite["Accept/Decline invites"]:::command
            end
        end

        subgraph SynapseZone["Synapse homeserver"]
            direction TB
            Rooms["Encrypted rooms<br/>profile thread + timeline"]:::external_system
            Account["Account data<br/>SSSS + key backup"]:::external_system
        end
    end

    Clinic --> SignIn
    Patient --> SignIn
    Ready --> PatientCRUD
    Ready --> ClinicMsg
    Ready --> SendInvite
    Ready --> ViewHolders
    Ready --> ReadMsg
    Ready --> RespondInvite
    PatientCRUD --> Crypto
    ClinicMsg --> Crypto
    SendInvite --> Crypto
    ViewHolders --> Crypto
    ReadMsg --> Crypto
    RespondInvite --> Crypto
    Crypto <--> Rooms
    Crypto <--> Account

    classDef actor fill:#ffffff,stroke:#166534,stroke-width:2px,color:#1f2937
    classDef command fill:#ffffff,stroke:#a7c5fc,stroke-width:2px,color:#1f2937
    classDef event fill:#ffffff,stroke:#feae57,stroke-width:2px,color:#1f2937
    classDef policy fill:#ffffff,stroke:#7c3aed,stroke-width:2px,color:#1f2937
    classDef reaction_policy fill:#ffffff,stroke:#da99e6,stroke-width:2px,color:#1f2937
    classDef read_model fill:#ffffff,stroke:#b0deb3,stroke-width:2px,color:#1f2937
    classDef ui fill:#ffffff,stroke:#f5f6f8,stroke-width:2px,color:#1f2937
    classDef external_system fill:#ffffff,stroke:#ffb3c5,stroke-width:2px,color:#1f2937

    style ClinicPOV fill:#ffffff,stroke:#ffffff,stroke-width:0px,color:#6b21a8
    style PatientPOV fill:#ffffff,stroke:#ffffff,stroke-width:0px,color:#6b21a8
    style App fill:#ffffff,stroke:#22d3ee,stroke-width:2px,color:#155e75
    style BrowserZone fill:#ffffff,stroke:#22d3ee,stroke-width:2px,color:#155e75
    style SynapseZone fill:#ffffff,stroke:#22d3ee,stroke-width:2px,color:#155e75
    style Gate fill:#ffffff,stroke:#000000,stroke-width:2px,color:#000000
    style Sdk fill:#ffffff,stroke:#000000,stroke-width:2px,color:#000000
    style ClinicFeatures fill:#ffffff,stroke:#000000,stroke-width:2px,color:#000000
    style PatientFeatures fill:#ffffff,stroke:#000000,stroke-width:2px,color:#000000
```

See `docs/v1.md` for per-flow sequence diagrams.

## TI-Messenger reference architecture

For comparison, this is gematik's TI-Messenger system overview — the German
healthcare Matrix federation this project could one day plug into.

```mermaid
flowchart LR
    subgraph CLIENT[" "]
        direction TB
        TMC[TI-Messenger-Client]
        OAC[Org-Admin-Client]
        FRD[Frontend des<br/>Registrierungs-Dienstes]
    end

    subgraph VZD[VZD-FHIR-Directory]
        direction LR
        FP[FHIR-Proxy]
        FD[(FHIR-Directory)]
        AS[Auth-Service]
        OAUTH[OAuth]
    end

    subgraph FACH[TI-Messenger-Fachdienst]
        direction TB
        RD[Registrierungs-Dienst]
        PG[Push-Gateway]
        subgraph MS[Messenger-Service]
            direction LR
            MP[Messenger-Proxy]
            MH[Matrix-Homeserver]
        end
    end

    IDP[Zentraler<br/>IDP-Dienst]
    subgraph FACH2[TI-Messenger-Fachdienst]
        F2[ peer provider ]
    end
    AUTH[Authentifizierungsdienst]

    TMC -- "Matrix – Client Server API" --> MP
    TMC -- "I_TiMessengerContactManagement" --> MP
    TMC -- "I_Registration" --> RD
    FRD -- "I_Registration" --> RD
    OAC -- "I_requestToken" --> RD

    MP <-- "HTTP(S) forward" --> MH
    RD -- "I_internVerification" --> MS

    RD -- "FHIRDirectoryTIMProviderAPI" --> FP
    FP --- FD
    FP --- AS
    AS --- OAUTH
    TMC -- "FHIRDirectorySearchAPI" --> FP
    OAC -- "FHIRDirectoryOwnerAPI" --> FP

    AS -- "OIDC" --> IDP
    RD -- "OIDC" --> IDP

    MH <-- "Matrix – Server Server API" --> FACH2

    TMC -- "Authentifizierungsverfahren" --> AUTH
    FACH -- "Authentifizierungsverfahren" --> AUTH

    classDef green    fill:#d4e8c8,stroke:#6b9c4e,color:#000
    classDef orange   fill:#fde2cc,stroke:#d97f3e,color:#000
    classDef blue     fill:#cfe2ef,stroke:#4a90b8,color:#000
    classDef darkblue fill:#a8c8dc,stroke:#3a7a9c,color:#000
    classDef gray     fill:#ececec,stroke:#888,color:#000

    class TMC,OAC,FRD green
    class FP,FD,AS,OAUTH orange
    class RD,PG blue
    class MP,MH darkblue
    class IDP,AUTH,F2 gray

    style CLIENT fill:#d4e8c8,stroke:#6b9c4e
    style VZD    fill:#fde2cc,stroke:#d97f3e
    style FACH   fill:#cfe2ef,stroke:#4a90b8
    style MS     fill:#a8c8dc,stroke:#3a7a9c
    style FACH2  fill:#cfe2ef,stroke:#4a90b8
```

Source: [gematik/api-ti-messenger](https://github.com/gematik/api-ti-messenger).

## Development

```bash
docker compose up -d   # local Synapse homeserver
pnpm install
pnpm dev
```

First session generates a recovery key (shown once). Subsequent sessions must
enter that key on sign-in — no feature is usable until the key is verified.
