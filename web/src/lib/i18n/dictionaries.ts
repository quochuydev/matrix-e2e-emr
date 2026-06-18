export type Locale = "de" | "en";

/** Languages offered in the switcher, in display order. */
export const LOCALES: { code: Locale; label: string }[] = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
];

// English is the source of truth: its keys define the translation surface, and
// every other locale must provide the same set (enforced by the `de` type).
const en = {
  // Brand
  "brand.title": "Patient Records",

  // Navigation
  "nav.dashboard": "Dashboard",
  "nav.patients": "Patients",
  "nav.clinics": "Clinics",

  // Account / sidebar footer
  "account.clinic": "Clinic",
  "account.patient": "Patient",
  "account.yourAccount": "Your account",
  "account.label": "Account",
  "account.language": "Language",

  // Security card
  "security.title": "End-to-end encrypted",
  "security.body":
    "Records are encrypted on this device. Only you and invited clinics can read them — not the server.",

  // Sign in
  "signIn.success":
    "Signed in. Enter your recovery key from the status bar to unlock encrypted history.",
  "signIn.title": "Sign in to Patient Records",
  "signIn.subtitle":
    "Each browser gets its own device. Use your Matrix username and password.",
  "signIn.username": "Username",
  "signIn.usernamePlaceholder": "@alice:matrix.org or alice",
  "signIn.password": "Password",
  "signIn.homeserver": "Homeserver",
  "signIn.identityServer": "Identity server",
  "signIn.submitting": "Signing in…",
  "signIn.submit": "Sign in",
  "signIn.noAccount": "Don't have an account?",
  "signIn.createOne": "Create one",

  // App shell
  "shell.connecting": "Connecting to Matrix…",
  "shell.connectError": "Couldn't connect to Matrix",
  "shell.unknownError": "Unknown error.",

  // Status bar
  "statusBar.invitesOne": "{count} invite",
  "statusBar.invitesOther": "{count} invites",
  "statusBar.reviewInvites": "Review pending room invites.",

  // Account popover
  "account.allReady": "All systems ready",
  "account.actionNeeded": "Action needed",
  "account.backingUpShort": "Backing up {count}…",
  "account.status": "Status",
  "account.ready": "Ready",
  "account.readOnly": "Read-only",
  "account.e2eReady": "E2E ready",
  "account.e2eLocked": "E2E locked",
  "account.checkingDevice": "Checking device verification…",
  "account.deviceSigned":
    "This device is signed by your account's cross-signing key.",
  "account.deviceNotSigned":
    "This device is not cross-signed. Unlock with your recovery key to verify it.",
  "account.deviceChecking": "Device …",
  "account.deviceVerified": "Device verified",
  "account.deviceUnverified": "Device unverified",
  "account.backupVersion": "Backup v{version}",
  "account.noBackup": "No backup",
  "account.uploadingKeysOne": "Uploading {count} key…",
  "account.uploadingKeysOther": "Uploading {count} keys…",
  "account.syncedAgo": "synced {ago}",
  "account.userId": "User ID",
  "account.copyUserId": "Copy user ID",
  "account.deviceId": "Device ID",
  "account.copyDeviceId": "Copy device ID",
  "account.recoveryKey": "Recovery key",
  "account.recoveryKeyTitle":
    "Unlock encrypted history by entering your recovery key.",
  "account.resetBackup": "Reset backup",
  "account.resetBackupTitle":
    "Create a fresh key backup. Only do this if your current backup is broken.",
  "account.signOut": "Sign out",
  "account.backingUpWaitOne": "Backing up {count} key… please wait",
  "account.backingUpWaitOther": "Backing up {count} keys… please wait",

  // Relative time
  "time.justNow": "just now",
  "time.secondsAgo": "{count}s ago",
  "time.minutesAgo": "{count}m ago",
  "time.hoursAgo": "{count}h ago",

  // Clipboard
  "copy.copied": "{label} copied.",

  // Sync state
  "sync.synced": "Synced",
  "sync.catchingUp": "Catching up",
  "sync.reconnecting": "Reconnecting",
  "sync.error": "Sync error",
  "sync.stopped": "Stopped",
  "sync.connecting": "Connecting",

  // Not-ready reasons
  "notReady.notSignedIn": "Not signed in.",
  "notReady.reconnecting": "Reconnecting to homeserver…",
  "notReady.catchup": "Catching up with homeserver…",
  "notReady.syncError": "Sync error — waiting for reconnection..",
  "notReady.syncing": "Waiting for first sync to finish…",
  "notReady.needsRecoveryKey":
    "Enter your recovery key in the status bar to unlock this session.",

  // Patient detail
  "patientDetail.loading":
    "Loading room… If this persists, the room may not be synced yet.",
  "patientDetail.back": "Back",
  "patientDetail.backToPatients": "Back to patients",
  "patientDetail.backToClinics": "Back to clinics",

  // Timeline
  "timeline.title": "Encrypted timeline",
  "timeline.subtitle": "Messages are visible only to members of this room.",
  "timeline.noMessages": "No messages yet.",
  "timeline.attachImage": "Attach image",
  "timeline.uploading": "Uploading image…",
  "timeline.composerPlaceholder":
    "Type a message… (Shift+Enter for a new line)",
  "timeline.notReadyFallback": "Not ready",
  "timeline.send": "Send",
  "timeline.deleteTitle": "Delete message?",
  "timeline.deleteDescription":
    "This redacts the message for everyone in the room. The content can't be recovered.",
  "timeline.cancel": "Cancel",
  "timeline.delete": "Delete",
  "timeline.deleting": "Deleting…",
  "timeline.messageDeletedToast": "Message deleted",

  // Message bubble
  "message.deleted": "Message deleted",
  "message.sending": "Sending…",
  "message.failedPrefix": "Failed to send · ",
  "message.retry": "Retry",
  "message.deleteMessage": "Delete message",
  "message.imageFallback": "image",
} as const;

export type TranslationKey = keyof typeof en;

const de: Record<TranslationKey, string> = {
  // Brand
  "brand.title": "Patient Records",

  // Navigation
  "nav.dashboard": "Übersicht",
  "nav.patients": "Patienten",
  "nav.clinics": "Kliniken",

  // Account / sidebar footer
  "account.clinic": "Klinik",
  "account.patient": "Patient",
  "account.yourAccount": "Ihr Konto",
  "account.label": "Konto",
  "account.language": "Sprache",

  // Security card
  "security.title": "Ende-zu-Ende-verschlüsselt",
  "security.body":
    "Akten werden auf diesem Gerät verschlüsselt. Nur Sie und eingeladene Kliniken können sie lesen — nicht der Server.",

  // Sign in
  "signIn.success":
    "Angemeldet. Geben Sie Ihren Wiederherstellungsschlüssel in der Statusleiste ein, um den verschlüsselten Verlauf zu entsperren.",
  "signIn.title": "Bei Patient Records anmelden",
  "signIn.subtitle":
    "Jeder Browser erhält ein eigenes Gerät. Verwenden Sie Ihren Matrix-Benutzernamen und Ihr Passwort.",
  "signIn.username": "Benutzername",
  "signIn.usernamePlaceholder": "@alice:matrix.org oder alice",
  "signIn.password": "Passwort",
  "signIn.homeserver": "Heimserver",
  "signIn.identityServer": "Identitätsserver",
  "signIn.submitting": "Anmeldung läuft…",
  "signIn.submit": "Anmelden",
  "signIn.noAccount": "Noch kein Konto?",
  "signIn.createOne": "Erstellen",

  // App shell
  "shell.connecting": "Verbindung zu Matrix…",
  "shell.connectError": "Verbindung zu Matrix fehlgeschlagen",
  "shell.unknownError": "Unbekannter Fehler.",

  // Status bar
  "statusBar.invitesOne": "{count} Einladung",
  "statusBar.invitesOther": "{count} Einladungen",
  "statusBar.reviewInvites": "Ausstehende Raum-Einladungen prüfen.",

  // Account popover
  "account.allReady": "Alle Systeme bereit",
  "account.actionNeeded": "Aktion erforderlich",
  "account.backingUpShort": "Sicherung {count}…",
  "account.status": "Status",
  "account.ready": "Bereit",
  "account.readOnly": "Schreibgeschützt",
  "account.e2eReady": "E2E bereit",
  "account.e2eLocked": "E2E gesperrt",
  "account.checkingDevice": "Geräteverifizierung wird geprüft…",
  "account.deviceSigned":
    "Dieses Gerät ist mit dem Cross-Signing-Schlüssel Ihres Kontos signiert.",
  "account.deviceNotSigned":
    "Dieses Gerät ist nicht cross-signiert. Entsperren Sie es mit Ihrem Wiederherstellungsschlüssel, um es zu verifizieren.",
  "account.deviceChecking": "Gerät …",
  "account.deviceVerified": "Gerät verifiziert",
  "account.deviceUnverified": "Gerät nicht verifiziert",
  "account.backupVersion": "Sicherung v{version}",
  "account.noBackup": "Keine Sicherung",
  "account.uploadingKeysOne": "{count} Schlüssel wird hochgeladen…",
  "account.uploadingKeysOther": "{count} Schlüssel werden hochgeladen…",
  "account.syncedAgo": "synchronisiert {ago}",
  "account.userId": "Benutzer-ID",
  "account.copyUserId": "Benutzer-ID kopieren",
  "account.deviceId": "Geräte-ID",
  "account.copyDeviceId": "Geräte-ID kopieren",
  "account.recoveryKey": "Wiederherstellungsschlüssel",
  "account.recoveryKeyTitle":
    "Entsperren Sie den verschlüsselten Verlauf, indem Sie Ihren Wiederherstellungsschlüssel eingeben.",
  "account.resetBackup": "Sicherung zurücksetzen",
  "account.resetBackupTitle":
    "Erstellen Sie eine neue Schlüsselsicherung. Tun Sie dies nur, wenn Ihre aktuelle Sicherung defekt ist.",
  "account.signOut": "Abmelden",
  "account.backingUpWaitOne": "{count} Schlüssel wird gesichert… bitte warten",
  "account.backingUpWaitOther":
    "{count} Schlüssel werden gesichert… bitte warten",

  // Relative time
  "time.justNow": "gerade eben",
  "time.secondsAgo": "vor {count}s",
  "time.minutesAgo": "vor {count}m",
  "time.hoursAgo": "vor {count}h",

  // Clipboard
  "copy.copied": "{label} kopiert.",

  // Sync state
  "sync.synced": "Synchronisiert",
  "sync.catchingUp": "Wird aufgeholt",
  "sync.reconnecting": "Neuverbindung",
  "sync.error": "Sync-Fehler",
  "sync.stopped": "Gestoppt",
  "sync.connecting": "Verbindung",

  // Not-ready reasons
  "notReady.notSignedIn": "Nicht angemeldet.",
  "notReady.reconnecting": "Neuverbindung zum Heimserver…",
  "notReady.catchup": "Wird mit dem Heimserver synchronisiert…",
  "notReady.syncError": "Sync-Fehler — warten auf Neuverbindung..",
  "notReady.syncing":
    "Warten auf Abschluss der ersten Synchronisierung…",
  "notReady.needsRecoveryKey":
    "Geben Sie Ihren Wiederherstellungsschlüssel in der Statusleiste ein, um diese Sitzung zu entsperren.",

  // Patient detail
  "patientDetail.loading":
    "Raum wird geladen… Falls dies anhält, ist der Raum möglicherweise noch nicht synchronisiert.",
  "patientDetail.back": "Zurück",
  "patientDetail.backToPatients": "Zurück zu Patienten",
  "patientDetail.backToClinics": "Zurück zu Kliniken",

  // Timeline
  "timeline.title": "Verschlüsselte Zeitleiste",
  "timeline.subtitle":
    "Nachrichten sind nur für Mitglieder dieses Raums sichtbar.",
  "timeline.noMessages": "Noch keine Nachrichten.",
  "timeline.attachImage": "Bild anhängen",
  "timeline.uploading": "Bild wird hochgeladen…",
  "timeline.composerPlaceholder":
    "Nachricht eingeben… (Umschalt+Eingabe für neue Zeile)",
  "timeline.notReadyFallback": "Nicht bereit",
  "timeline.send": "Senden",
  "timeline.deleteTitle": "Nachricht löschen?",
  "timeline.deleteDescription":
    "Dies entfernt die Nachricht für alle im Raum. Der Inhalt kann nicht wiederhergestellt werden.",
  "timeline.cancel": "Abbrechen",
  "timeline.delete": "Löschen",
  "timeline.deleting": "Wird gelöscht…",
  "timeline.messageDeletedToast": "Nachricht gelöscht",

  // Message bubble
  "message.deleted": "Nachricht gelöscht",
  "message.sending": "Wird gesendet…",
  "message.failedPrefix": "Senden fehlgeschlagen · ",
  "message.retry": "Erneut versuchen",
  "message.deleteMessage": "Nachricht löschen",
  "message.imageFallback": "Bild",
};

export const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
  en,
  de,
};
