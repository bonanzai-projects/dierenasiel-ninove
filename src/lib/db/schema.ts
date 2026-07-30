import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  date,
  timestamp,
  integer,
  numeric,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const kennels = pgTable("kennels", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).unique().notNull(),
  zone: varchar("zone", { length: 20 }).notNull(), // 'honden', 'katten', 'andere'
  capacity: integer("capacity").notNull().default(2),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  // Story 10.19: positie op grondplan (percentages 0-100). NULL = niet renderen.
  posX: numeric("pos_x", { precision: 5, scale: 2 }),
  posY: numeric("pos_y", { precision: 5, scale: 2 }),
  posW: numeric("pos_w", { precision: 5, scale: 2 }),
  posH: numeric("pos_h", { precision: 5, scale: 2 }),
  // Story 10.19+: laagnummer voor gestapelde hokken (default 1).
  layer: integer("layer").notNull().default(1),
});

export const animals = pgTable("animals", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  aliasName: varchar("alias_name", { length: 100 }),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  species: varchar("species", { length: 50 }).notNull(),
  breed: varchar("breed", { length: 100 }),
  gender: varchar("gender", { length: 20 }).notNull(),
  dateOfBirth: date("date_of_birth"),
  isNeutered: boolean("is_neutered").default(false),
  neuteredDate: date("neutered_date"),
  neuteredByShelter: boolean("neutered_by_shelter"),
  // `description` = de uitgebreide werktekst. Story 10.32 splitst wat er
  // effectief getoond wordt af: leeg = terugval op `description`.
  description: text("description").notNull(),
  websiteDescription: text("website_description"),
  posterDescription: text("poster_description"),
  shortDescription: varchar("short_description", { length: 300 }),
  imageUrl: varchar("image_url", { length: 500 }),
  images: text("images").array(),
  status: varchar("status", { length: 30 }).default("beschikbaar"),
  badge: varchar("badge", { length: 30 }),
  isFeatured: boolean("is_featured").default(false),
  color: varchar("color", { length: 100 }),
  identificationNr: varchar("identification_nr", { length: 50 }),
  isNewChip: boolean("is_new_chip").default(false),
  passportNr: varchar("passport_nr", { length: 50 }),
  isNewPassport: boolean("is_new_passport").default(false),
  barcode: varchar("barcode", { length: 100 }),
  isAvailableForAdoption: boolean("is_available_for_adoption").default(false),
  isOnWebsite: boolean("is_on_website").default(false),
  // Story 10.32: publicatiekanaal "affiche". Wordt (voorlopig) enkel bewaard —
  // er hangt bewust geen logica aan; de affiche-PDF kan voor elk dier gemaakt worden.
  isOnPoster: boolean("is_on_poster").default(false),
  isInShelter: boolean("is_in_shelter").default(true),
  kennelId: integer("kennel_id").references(() => kennels.id, { onDelete: "set null" }),
  intakeDate: date("intake_date"),
  intakeReason: varchar("intake_reason", { length: 50 }),
  isPickedUpByShelter: boolean("is_picked_up_by_shelter").default(false),
  intakeMetadata: jsonb("intake_metadata"),
  adoptedDate: date("adopted_date"),
  dossierNr: varchar("dossier_nr", { length: 100 }),
  pvNr: varchar("pv_nr", { length: 100 }),
  // Reden van inbeslagname (waarom het dier in beslag genomen is) — vrij tekst,
  // los van intakeReason "ibn" dat enkel het type intake vastlegt (Sven 2026-07-24).
  ibnReason: text("ibn_reason"),
  ibnDecisionDeadline: date("ibn_decision_deadline"),
  workflowPhase: varchar("workflow_phase", { length: 50 }),
  outtakeDate: date("outtake_date"),
  outtakeReason: varchar("outtake_reason", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const newsArticles = pgTable("news_articles", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  excerpt: varchar("excerpt", { length: 500 }),
  content: text("content").notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  publishedAt: timestamp("published_at"),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  subject: varchar("subject", { length: 100 }).notNull(),
  message: text("message").notNull(),
  animalId: integer("animal_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const kennelSponsors = pgTable("kennel_sponsors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  websiteUrl: varchar("website_url", { length: 500 }),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  metaDescription: varchar("meta_description", { length: 300 }),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  role: varchar("role", { length: 20 }).notNull(), // beheerder | medewerker | dierenarts | adoptieconsulent | coördinator | wandelaar | surfer
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const animalAttachments = pgTable("animal_attachments", {
  id: serial("id").primaryKey(),
  animalId: integer("animal_id").notNull().references(() => animals.id, { onDelete: "cascade" }),
  followupId: integer("followup_id").references(() => postAdoptionFollowups.id, { onDelete: "set null" }),
  fileUrl: text("file_url").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  context: varchar("context", { length: 20 }).default("dossier").notNull(),
  description: varchar("description", { length: 255 }),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
}, (table) => [
  index("idx_animal_attachments_animal_id").on(table.animalId),
]);

export const neglectReports = pgTable("neglect_reports", {
  id: serial("id").primaryKey(),
  animalId: integer("animal_id").notNull().references(() => animals.id, { onDelete: "cascade" }),
  date: date("date"),
  vetName: varchar("vet_name", { length: 200 }),
  healthStatusOnArrival: text("health_status_on_arrival").notNull(),
  neglectFindings: text("neglect_findings").notNull(),
  treatmentsGiven: text("treatments_given"),
  weightOnArrival: varchar("weight_on_arrival", { length: 50 }),
  photos: text("photos").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("neglect_reports_animal_id_unique").on(table.animalId),
  index("idx_neglect_reports_animal_id").on(table.animalId),
]);

export const behaviorRecords = pgTable("behavior_records", {
  id: serial("id").primaryKey(),
  animalId: integer("animal_id").notNull().references(() => animals.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  checklist: jsonb("checklist").notNull(),
  notes: text("notes"),
  recordedBy: integer("recorded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_behavior_records_animal_id").on(table.animalId),
]);

export const feedingPlans = pgTable("feeding_plans", {
  id: serial("id").primaryKey(),
  animalId: integer("animal_id").notNull().references(() => animals.id, { onDelete: "cascade" }),
  questionnaire: jsonb("questionnaire").notNull(),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("feeding_plans_animal_id_unique").on(table.animalId),
  index("idx_feeding_plans_animal_id").on(table.animalId),
]);

export const vaccinations = pgTable("vaccinations", {
  id: serial("id").primaryKey(),
  animalId: integer("animal_id").notNull().references(() => animals.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  date: date("date").notNull(),
  nextDueDate: date("next_due_date"),
  givenByShelter: boolean("given_by_shelter").default(true).notNull(),
  administeredBy: integer("administered_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_vaccinations_animal_id").on(table.animalId),
  index("idx_vaccinations_next_due_date").on(table.nextDueDate),
]);

// Story 10.31: deze tabel registreert antiparasitaire behandelingen. `category`
// onderscheidt ontworming van vlooienbehandeling; bestaande rijen zijn ontworming.
export const dewormings = pgTable("dewormings", {
  id: serial("id").primaryKey(),
  animalId: integer("animal_id").notNull().references(() => animals.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 20 }).default("ontworming").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_dewormings_animal_id").on(table.animalId),
]);

export const vetVisits = pgTable("vet_visits", {
  id: serial("id").primaryKey(),
  animalId: integer("animal_id").notNull().references(() => animals.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  location: varchar("location", { length: 50 }).notNull(),
  diagnosis: varchar("diagnosis", { length: 200 }),
  complaints: text("complaints"),
  todo: text("todo"),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  recordedBy: integer("recorded_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_vet_visits_animal_id").on(table.animalId),
]);

export const operations = pgTable("operations", {
  id: serial("id").primaryKey(),
  animalId: integer("animal_id").notNull().references(() => animals.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  date: date("date").notNull(),
  status: varchar("status", { length: 30 }).default("gepland").notNull(),
  recordedBy: integer("recorded_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_operations_animal_id").on(table.animalId),
]);

export const medications = pgTable("medications", {
  id: serial("id").primaryKey(),
  animalId: integer("animal_id").notNull().references(() => animals.id, { onDelete: "cascade" }),
  medicationName: varchar("medication_name", { length: 200 }).notNull(),
  dosage: varchar("dosage", { length: 100 }).notNull(),
  quantity: varchar("quantity", { length: 100 }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  recordedBy: integer("recorded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_medications_animal_id").on(table.animalId),
  index("idx_medications_end_date_active").on(table.endDate, table.isActive),
]);

export const medicationLogs = pgTable("medication_logs", {
  id: serial("id").primaryKey(),
  medicationId: integer("medication_id").notNull().references(() => medications.id, { onDelete: "cascade" }),
  administeredAt: timestamp("administered_at", { withTimezone: true }).notNull(),
  administeredBy: varchar("administered_by", { length: 100 }),
  administeredByUserId: integer("administered_by_user_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_medication_logs_medication_id").on(table.medicationId),
  index("idx_medication_logs_administered_at").on(table.administeredAt),
]);

export const animalTodos = pgTable("animal_todos", {
  id: serial("id").primaryKey(),
  animalId: integer("animal_id").notNull().references(() => animals.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completedByUserId: integer("completed_by_user_id").references(() => users.id),
  dueDate: date("due_date"),
  isAutoGenerated: boolean("is_auto_generated").default(false).notNull(),
  workflowPhase: varchar("workflow_phase", { length: 50 }),
  priority: varchar("priority", { length: 20 }).default("normaal").notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_animal_todos_animal_id").on(table.animalId),
  index("idx_animal_todos_is_completed").on(table.isCompleted),
  index("idx_animal_todos_due_date").on(table.dueDate),
]);

export const vetInspectionReports = pgTable("vet_inspection_reports", {
  id: serial("id").primaryKey(),
  visitDate: date("visit_date").notNull(),
  vetUserId: integer("vet_user_id").references(() => users.id),
  vetName: varchar("vet_name", { length: 200 }).notNull(),
  vetSignature: boolean("vet_signature").default(false).notNull(),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  animalsTreated: jsonb("animals_treated").default([]),
  animalsEuthanized: jsonb("animals_euthanized").default([]),
  abnormalBehavior: jsonb("abnormal_behavior").default([]),
  recommendations: text("recommendations"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_vet_inspection_reports_visit_date").on(table.visitDate),
]);

export const adoptionCandidates = pgTable("adoption_candidates", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  animalId: integer("animal_id").references(() => animals.id),
  requestedAnimalName: varchar("requested_animal_name", { length: 200 }),
  species: varchar("species", { length: 20 }),
  questionnaireAnswers: jsonb("questionnaire_answers").notNull().default({}),
  category: varchar("category", { length: 30 }), // niet_weerhouden, mogelijks, goede_kandidaat
  categorySetBy: varchar("category_set_by", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, screening, approved, rejected, adopted
  notes: text("notes"),
  reviewMartine: varchar("review_martine", { length: 20 }),
  reviewNathalie: varchar("review_nathalie", { length: 20 }),
  reviewSven: varchar("review_sven", { length: 20 }),
  blacklistMatch: boolean("blacklist_match").default(false).notNull(),
  blacklistMatchEntryId: integer("blacklist_match_entry_id").references(() => blacklistEntries.id, { onDelete: "set null" }),
  anonymisedAt: timestamp("anonymised_at", { withTimezone: true }),
  retentionFlaggedAt: timestamp("retention_flagged_at", { withTimezone: true }),
  retentionExtendedAt: timestamp("retention_extended_at", { withTimezone: true }),
  retentionExtensionReason: text("retention_extension_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_adoption_candidates_animal_id").on(table.animalId),
  index("idx_adoption_candidates_status").on(table.status),
]);


export const kennismakingen = pgTable("kennismakingen", {
  id: serial("id").primaryKey(),
  adoptionCandidateId: integer("adoption_candidate_id").notNull().references(() => adoptionCandidates.id),
  animalId: integer("animal_id").references(() => animals.id),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  location: varchar("location", { length: 200 }),
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled, completed, cancelled
  outcome: varchar("outcome", { length: 20 }), // positief, twijfel
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_kennismakingen_candidate_id").on(table.adoptionCandidateId),
]);

export const adoptionContracts = pgTable("adoption_contracts", {
  id: serial("id").primaryKey(),
  animalId: integer("animal_id").notNull().references(() => animals.id),
  // Story 10.20+: candidateId is nu nullable — contracten kunnen ook rechtstreeks
  // (zonder gekoppelde aanvraag) aangemaakt worden.
  candidateId: integer("candidate_id").references(() => adoptionCandidates.id),
  contractDate: date("contract_date").notNull(),
  paymentAmount: varchar("payment_amount", { length: 20 }).notNull(), // stored as string for decimal precision
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(), // cash, payconiq, overschrijving
  contractPdfUrl: varchar("contract_pdf_url", { length: 500 }),
  dogidCatidTransferDeadline: date("dogid_catid_transfer_deadline"),
  dogidCatidTransferred: boolean("dogid_catid_transferred").default(false),
  notes: text("notes"),
  // Story 10.20: workflow status + signing.
  status: varchar("status", { length: 40 }).notNull().default("getekend"),
  // draft | klaar_voor_handtekening | verzonden_voor_digitale_handtekening | getekend | geannuleerd
  signedDocumentUrl: varchar("signed_document_url", { length: 500 }),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  signingMethod: varchar("signing_method", { length: 20 }), // 'papier' | 'digitaal'
  // Story 10.20+: snapshot-velden — bevriezen de adoptant/dier-data op het moment
  // van contract-aanmaak. Latere wijzigingen aan candidate of animal raken niet aan
  // het contract. NULL voor oude contracten (PDF-route fallt terug op candidate/animal).
  snapshotAdoptantFirstName: varchar("snapshot_adoptant_first_name", { length: 100 }),
  snapshotAdoptantLastName: varchar("snapshot_adoptant_last_name", { length: 100 }),
  snapshotAdoptantEmail: varchar("snapshot_adoptant_email", { length: 200 }),
  snapshotAdoptantPhone: varchar("snapshot_adoptant_phone", { length: 30 }),
  snapshotAdoptantAddress: varchar("snapshot_adoptant_address", { length: 300 }),
  snapshotAdoptantBirthDate: varchar("snapshot_adoptant_birth_date", { length: 30 }),
  snapshotAdoptantIdNumber: varchar("snapshot_adoptant_id_number", { length: 50 }),
  snapshotAnimalName: varchar("snapshot_animal_name", { length: 100 }),
  snapshotAnimalSpecies: varchar("snapshot_animal_species", { length: 50 }),
  snapshotAnimalBreed: varchar("snapshot_animal_breed", { length: 100 }),
  snapshotAnimalBirthDate: varchar("snapshot_animal_birth_date", { length: 30 }),
  snapshotAnimalGender: varchar("snapshot_animal_gender", { length: 20 }),
  snapshotAnimalColor: varchar("snapshot_animal_color", { length: 100 }),
  snapshotAnimalChipNr: varchar("snapshot_animal_chip_nr", { length: 50 }),
  snapshotAnimalPassportNr: varchar("snapshot_animal_passport_nr", { length: 50 }),
  snapshotAnimalDescription: text("snapshot_animal_description"),
  snapshotAnimalNeutered: boolean("snapshot_animal_neutered"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_adoption_contracts_candidate_id").on(table.candidateId),
  index("idx_adoption_contracts_animal_id").on(table.animalId),
  index("idx_adoption_contracts_status").on(table.status),
]);

export const postAdoptionFollowups = pgTable("post_adoption_followups", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => adoptionContracts.id, { onDelete: "cascade" }),
  followupType: varchar("followup_type", { length: 20 }).notNull(), // '1_week' | '1_month' | 'custom'
  date: date("date").notNull(),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("planned"), // 'planned' | 'completed' | 'no_response'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_post_adoption_followups_contract_id").on(table.contractId),
  index("idx_post_adoption_followups_status_date").on(table.status, table.date),
]);

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_audit_logs_entity").on(table.entityType, table.entityId),
  index("idx_audit_logs_user").on(table.userId),
  index("idx_audit_logs_created_at").on(table.createdAt),
]);

export const walkers = pgTable("walkers", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  allergies: text("allergies"),
  childrenWalkAlong: boolean("children_walk_along").default(false).notNull(),
  regulationsRead: boolean("regulations_read").default(false).notNull(),
  barcode: varchar("barcode", { length: 50 }),
  photoUrl: varchar("photo_url", { length: 500 }),
  isApproved: boolean("is_approved").default(false).notNull(),
  walkCount: integer("walk_count").default(0).notNull(),
  isWalkingClubMember: boolean("is_walking_club_member").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  rejectionReason: text("rejection_reason"),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  anonymisedAt: timestamp("anonymised_at", { withTimezone: true }),
  retentionFlaggedAt: timestamp("retention_flagged_at", { withTimezone: true }),
  retentionExtendedAt: timestamp("retention_extended_at", { withTimezone: true }),
  retentionExtensionReason: text("retention_extension_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_walkers_status").on(table.status),
  index("idx_walkers_email").on(table.email),
  index("idx_walkers_user_id").on(table.userId),
]);

export const walks = pgTable("walks", {
  id: serial("id").primaryKey(),
  walkerId: integer("walker_id").notNull().references(() => walkers.id, { onDelete: "cascade" }),
  animalId: integer("animal_id").notNull().references(() => animals.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }),
  durationMinutes: integer("duration_minutes"),
  remarks: text("remarks"),
  status: varchar("status", { length: 20 }).default("planned").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_walks_walker_id").on(table.walkerId),
  index("idx_walks_animal_id").on(table.animalId),
  index("idx_walks_date").on(table.date),
  index("idx_walks_status").on(table.status),
]);

// Epic 12 fase 2: handmatige kalender-items die het team zelf beheert
// (evenementen, stage, afstand-afspraken, vrije afspraken). Aggregatie-events
// uit fase 1 komen uit hun eigen brontabellen; dit is de enige "eigen" bron.
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  category: varchar("category", { length: 30 }).notNull(), // evenement | stage | afstand | afspraak
  description: text("description"),
  date: date("date").notNull(),
  endDate: date("end_date"),
  startTime: varchar("start_time", { length: 5 }), // HH:MM; leeg = hele dag
  endTime: varchar("end_time", { length: 5 }),
  location: varchar("location", { length: 200 }),
  animalId: integer("animal_id").references(() => animals.id, { onDelete: "set null" }),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_calendar_events_date").on(table.date),
]);

// Epic 13 — evenementenbeheer (eetkermis, quiz, opendeurdag ...). Het evenement
// zelf; draaiboek, kosten en evaluatie hangen er in eigen tabellen aan.
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 40 }).notNull(), // zie EVENT_TYPES
  status: varchar("status", { length: 20 }).notNull().default("gepland"), // zie EVENT_STATUSES
  date: date("date").notNull(),
  endDate: date("end_date"),
  startTime: varchar("start_time", { length: 5 }), // HH:MM; leeg = hele dag
  endTime: varchar("end_time", { length: 5 }),
  location: varchar("location", { length: 200 }),
  // Vrije tekst: wie de eetkermis trekt is niet noodzakelijk iemand met een login.
  responsible: varchar("responsible", { length: 120 }),
  expectedVisitors: integer("expected_visitors"),
  description: text("description"),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_events_date").on(table.date),
]);

// Epic 13, story 13.2 — het draaiboek: taken per fase van een evenement.
// onDelete cascade: een evenement verwijderen laat geen taken achter.
export const eventTasks = pgTable("event_tasks", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  phase: varchar("phase", { length: 20 }).notNull(), // voorbereiding | dag-zelf | afbraak
  title: varchar("title", { length: 200 }).notNull(),
  date: date("date"),
  time: varchar("time", { length: 5 }), // HH:MM
  responsible: varchar("responsible", { length: 120 }),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  done: boolean("done").notNull().default(false),
  doneAt: timestamp("done_at", { withTimezone: true }),
  doneByUserId: integer("done_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_event_tasks_event_id").on(table.eventId),
]);

export const animalWorkflowHistory = pgTable("animal_workflow_history", {
  id: serial("id").primaryKey(),
  animalId: integer("animal_id").references(() => animals.id).notNull(),
  fromPhase: varchar("from_phase", { length: 50 }),
  toPhase: varchar("to_phase", { length: 50 }).notNull(),
  changedBy: integer("changed_by").references(() => users.id).notNull(),
  changeReason: text("change_reason"),
  autoActionsTriggered: jsonb("auto_actions_triggered"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_workflow_history_animal_id").on(table.animalId),
  index("idx_workflow_history_created_at").on(table.createdAt),
]);

export const mailingLists = pgTable("mailing_lists", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  fromEmail: varchar("from_email", { length: 200 }).notNull().default("honden@dierenasielninove.be"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const mailingSends = pgTable("mailing_sends", {
  id: serial("id").primaryKey(),
  subject: varchar("subject", { length: 500 }).notNull(),
  templateName: varchar("template_name", { length: 100 }).notNull(),
  fromEmail: varchar("from_email", { length: 200 }).notNull(),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentBy: integer("sent_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_mailing_sends_sent_by").on(table.sentBy),
  index("idx_mailing_sends_created_at").on(table.createdAt),
]);

export const mailingSendRecipients = pgTable("mailing_send_recipients", {
  id: serial("id").primaryKey(),
  sendId: integer("send_id").notNull().references(() => mailingSends.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 200 }).notNull(),
  recipientName: varchar("recipient_name", { length: 200 }).notNull(),
  animalName: varchar("animal_name", { length: 200 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
}, (table) => [
  index("idx_mailing_send_recipients_send_id").on(table.sendId),
]);

// Story 10.18: bibliotheek met logo's per gemeente.
// deletedAt: soft-delete zodat historische campagnes hun opdrachtgever-logo
// blijven tonen wanneer een opdrachtgever uit de bibliotheek wordt verwijderd.
export const municipalityLogos = pgTable("municipality_logos", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull().unique(),
  logoUrl: varchar("logo_url", { length: 500 }).notNull(),
  uploadedBy: varchar("uploaded_by", { length: 200 }),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const strayCatCampaigns = pgTable("stray_cat_campaigns", {
  id: serial("id").primaryKey(),
  requestDate: date("request_date").notNull(),
  municipality: varchar("municipality", { length: 200 }).notNull(),
  address: text("address").notNull(),
  cageDeploymentDate: date("cage_deployment_date"),
  cageNumbers: varchar("cage_numbers", { length: 100 }),
  inspectionDate: date("inspection_date"),
  catDescription: text("cat_description"),
  remarks: text("remarks"),
  cageAtVet: varchar("cage_at_vet", { length: 100 }),
  vetName: varchar("vet_name", { length: 200 }),
  fivStatus: varchar("fiv_status", { length: 20 }),
  felvStatus: varchar("felv_status", { length: 20 }),
  outcome: varchar("outcome", { length: 30 }),
  status: varchar("status", { length: 20 }).default("open").notNull(),
  photoUrl: varchar("photo_url", { length: 500 }),
  municipalityLogoId: integer("municipality_logo_id").references(() => municipalityLogos.id, { onDelete: "set null" }),
  linkedAnimalId: integer("linked_animal_id").references(() => animals.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_stray_cat_campaigns_status").on(table.status),
  index("idx_stray_cat_campaigns_municipality").on(table.municipality),
  index("idx_stray_cat_campaigns_request_date").on(table.requestDate),
]);

// Story 10.10: master-lijst van diagnoses voor bezoekrapport-suggesties.
export const veterinaryDiagnoses = pgTable("veterinary_diagnoses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Beheerbare kooien-bibliotheek voor zwerfkat-campagnes (vervangt
// hardcoded CAGE_NUMBERS-constant). Codes (bv. K1) zijn unique.
// deletedAt: soft-delete zodat historische campagnes hun kooi-referentie
// blijven herkennen wanneer een kooi uit de bibliotheek wordt verwijderd.
export const cages = pgTable("cages", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Meerdere foto's per zwerfkat-campagne (vervangt het single-photo
// strayCatCampaigns.photoUrl veld; dat blijft staan voor backwards-compat).
export const strayCatCampaignPhotos = pgTable("stray_cat_campaign_photos", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => strayCatCampaigns.id, { onDelete: "cascade" }),
  blobUrl: varchar("blob_url", { length: 500 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  uploadedBy: varchar("uploaded_by", { length: 200 }),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_stray_cat_campaign_photos_campaign_id").on(table.campaignId),
]);

// Story 10.17: .eml-uploads van gemeente per campagne.
export const strayCatCampaignAttachments = pgTable("stray_cat_campaign_attachments", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => strayCatCampaigns.id, { onDelete: "cascade" }),
  blobUrl: varchar("blob_url", { length: 500 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  uploadedBy: varchar("uploaded_by", { length: 200 }),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_stray_cat_campaign_attachments_campaign_id").on(table.campaignId),
]);

// Medische inspecties: 1 rij per kat die naar dierenarts gebracht is binnen
// een campagne. Vervangt de single-cat campaign-level fields (inspectionDate,
// vetName, catDescription, cageAtVet, fivStatus, felvStatus, outcome).
// Cascade delete bij verwijderen van de campagne.
export const strayCatCampaignMedicalInspections = pgTable("stray_cat_campaign_medical_inspections", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => strayCatCampaigns.id, { onDelete: "cascade" }),
  inspectionDate: date("inspection_date").notNull(),
  vetName: varchar("vet_name", { length: 200 }),
  catDescription: text("cat_description"),
  cageAtVet: varchar("cage_at_vet", { length: 100 }),
  fivStatus: varchar("fiv_status", { length: 20 }),
  felvStatus: varchar("felv_status", { length: 20 }),
  outcome: varchar("outcome", { length: 30 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_stray_cat_campaign_medical_inspections_campaign_id").on(table.campaignId),
]);

// Story 10.9: log van alle inspectiebezoeken op een campagne (incl. lege).
export const strayCatCampaignInspections = pgTable("stray_cat_campaign_inspections", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => strayCatCampaigns.id, { onDelete: "cascade" }),
  inspectionDate: date("inspection_date").notNull(),
  wasSuccessful: boolean("was_successful").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_stray_cat_campaign_inspections_campaign_id").on(table.campaignId),
]);

export const blacklistEntries = pgTable("blacklist_entries", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  address: text("address"),
  reason: text("reason").notNull(),
  addedBy: varchar("added_by", { length: 100 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const surrenderRequests = pgTable("surrender_requests", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 200 }).notNull(),
  species: varchar("species", { length: 20 }).notNull(), // hond, kat, andere
  ownerName: varchar("owner_name", { length: 200 }).notNull(),
  address: text("address").notNull(),
  postalCode: varchar("postal_code", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  surrenderReason: text("surrender_reason").notNull(),
  answers: jsonb("answers").notNull().default({}),
  photoUrls: text("photo_urls").array(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, contacted, scheduled, completed, rejected
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_surrender_requests_status").on(table.status),
  index("idx_surrender_requests_created_at").on(table.createdAt),
]);

// Story 10.32: omgangseigenschappen van een dier (kan met kinderen/katten, zindelijk, ...),
// gebruikt op de dierdetailpagina en op de affiche voor het bord buiten. Bewust een eigen
// tabel i.p.v. 10 kolommen op `animals`: de lijst kan groeien of krimpen zonder migratie
// van de kerntabel, en intake-/bewerkformulieren, R1 en de exports blijven onaangeroerd.
// NB: niet te verwarren met de kinderen-/tuin-/ervaringsvragen in
// `adoptionCandidates.questionnaireAnswers` — die gaan over het gezin van de aanvrager.
export const animalTraits = pgTable("animal_traits", {
  id: serial("id").primaryKey(),
  animalId: integer("animal_id").notNull().unique().references(() => animals.id, { onDelete: "cascade" }),
  traits: jsonb("traits").$type<Record<string, string>>().notNull().default({}),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_animal_traits_animal_id").on(table.animalId),
]);

export const shelterSettings = pgTable("shelter_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).unique().notNull(),
  value: jsonb("value").notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Epic 11 — koppeling met AnimalShelter.be (ALLEEN-LEZEN).
// Zie _bmad-output/implementation-artifacts/epic-11-koerswijziging-2026-07-26.md.
//
// Bewust een koppelTABEL en geen kolom op `animals`: bij de eerste meting bestonden
// 46 van de 53 externe dieren lokaal nog niet, en we moeten juist óók "bestaat enkel
// daar" en "bestaat enkel hier" kunnen tonen. De koppeling is een relatie tussen twee
// registraties, geen eigenschap van één dier.
// ---------------------------------------------------------------------------

export const animalShelterLinks = pgTable("animalshelter_links", {
  id: serial("id").primaryKey(),
  // NULL = dit dier bestaat (nog) alleen bij AnimalShelter.
  animalId: integer("animal_id").references(() => animals.id, { onDelete: "cascade" }),
  externalId: integer("external_id").notNull().unique(),
  externalNumber: integer("external_number"),
  category: varchar("category", { length: 10 }).notNull(), // dogs | cats | other
  matchMethod: varchar("match_method", { length: 20 }), // chip | nummer | handmatig
  status: varchar("status", { length: 20 }).notNull().default("niet_gekoppeld"), // gekoppeld | niet_gekoppeld | genegeerd
  linkedBy: integer("linked_by").references(() => users.id),
  linkedAt: timestamp("linked_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_animalshelter_links_animal_id").on(table.animalId),
  index("idx_animalshelter_links_status").on(table.status),
]);

// Eén actieve beslissing per (dier, veld). "negeer_waarde" is waardegebonden via
// `remoteValueHash`: verandert AnimalShelter dat veld later, dan komt het verschil
// terug. "negeer_altijd" komt niet meer terug. Zie koerswijziging §4.1 — dempen
// zonder terugkeer maakt van een beslissing een blinde vlek.
export const animalShelterFieldDecisions = pgTable("animalshelter_field_decisions", {
  id: serial("id").primaryKey(),
  animalId: integer("animal_id").notNull().references(() => animals.id, { onDelete: "cascade" }),
  fieldKey: varchar("field_key", { length: 50 }).notNull(),
  decision: varchar("decision", { length: 20 }).notNull(), // negeer_waarde | negeer_altijd | overgenomen
  remoteValueHash: varchar("remote_value_hash", { length: 64 }),
  remoteValue: text("remote_value"),
  localValue: text("local_value"),
  decidedBy: integer("decided_by").references(() => users.id),
  decidedAt: timestamp("decided_at", { withTimezone: true }).defaultNow().notNull(),
  note: text("note"),
}, (table) => [
  unique("uniq_animalshelter_decision_animal_field").on(table.animalId, table.fieldKey),
  index("idx_animalshelter_decisions_animal_id").on(table.animalId),
]);

// Bewaarde momentopnames van de databank (Story 10.53). Bewust ZONDER
// verwijzingen naar andere tabellen: bij het terugzetten wordt alles leeggemaakt
// met TRUNCATE ... CASCADE, en een verwijzing zou deze tabel mee wegvegen.
// `content` is de volledige momentopname als JSON; het logboek zit er niet in.
export const databaseBackups = pgTable("database_backups", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdByUserId: integer("created_by_user_id"),
  createdByName: varchar("created_by_name", { length: 120 }),
  isAutomatic: boolean("is_automatic").default(false).notNull(),
  rowCount: integer("row_count").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  tableCounts: jsonb("table_counts"),
  content: text("content").notNull(),
}, (table) => [
  index("idx_database_backups_created_at").on(table.createdAt),
]);
