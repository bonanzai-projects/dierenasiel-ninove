import { notFound } from "next/navigation";
import { getAnimalById } from "@/lib/queries/animals";
import { getAttachmentsByAnimalId } from "@/lib/queries/attachments";
import { getKennels } from "@/lib/queries/kennels";
import { getNeglectReportByAnimalId } from "@/lib/queries/neglect-reports";
import AnimalEditForm from "@/components/beheerder/dieren/AnimalEditForm";
import FileUpload from "@/components/beheerder/shared/FileUpload";
import AttachmentGallery from "@/components/beheerder/dieren/AttachmentGallery";
import KennelSelector from "@/components/beheerder/dieren/KennelSelector";
import StatusChanger from "@/components/beheerder/dieren/StatusChanger";
import OuttakeForm from "@/components/beheerder/dieren/OuttakeForm";
import AdoptionToggle from "@/components/beheerder/dieren/AdoptionToggle";
import NeglectReportSection from "@/components/beheerder/dieren/NeglectReportSection";
import BehaviorRecordSection from "@/components/beheerder/dieren/BehaviorRecordSection";
import FeedingPlanSection from "@/components/beheerder/dieren/FeedingPlanSection";
import VaccinationSection from "@/components/beheerder/dieren/VaccinationSection";
import DewormingSection from "@/components/beheerder/dieren/DewormingSection";
import VetVisitSection from "@/components/beheerder/dieren/VetVisitSection";
import OperationSection from "@/components/beheerder/dieren/OperationSection";
import MedicationSection from "@/components/beheerder/dieren/MedicationSection";
import TodoSection from "@/components/beheerder/dieren/TodoSection";
import { getBehaviorRecordsByAnimalId, countBehaviorRecords } from "@/lib/queries/behavior-records";
import { getFeedingPlanByAnimalId } from "@/lib/queries/feeding-plans";
import { getVaccinationsByAnimalId } from "@/lib/queries/vaccinations";
import { getDewormingsByAnimalId } from "@/lib/queries/dewormings";
import { getVetVisitsByAnimalId } from "@/lib/queries/vet-visits";
import { getOperationsByAnimalId } from "@/lib/queries/operations";
import { getMedicationsByAnimalId } from "@/lib/queries/medications";
import { getTodayMedicationLogsByAnimalId } from "@/lib/queries/medication-logs";
import { getTodosByAnimalId, countOpenTodosByAnimalId } from "@/lib/queries/animal-todos";
import { getWalkHistoryByAnimalId, computeWalkStats } from "@/lib/queries/walks";
import WalkHistorySection from "@/components/beheerder/wandelaars/WalkHistorySection";
import { getWorkflowSettings } from "@/lib/queries/shelter-settings";
import WorkflowStepbar from "@/components/beheerder/dieren/WorkflowStepbar";
import WorkflowHistorySection from "@/components/beheerder/dieren/WorkflowHistorySection";
import { getWorkflowHistoryWithUserByAnimalId } from "@/lib/queries/workflow";
import AnimalDetailTabs from "@/components/beheerder/shared/AnimalDetailTabs";
import AnimalTraitsSection from "@/components/beheerder/dieren/AnimalTraitsSection";
import { getAnimalTraits } from "@/lib/queries/animal-traits";

function IbnMetadata({ metadata }: { metadata: unknown }) {
  if (!metadata || typeof metadata !== "object") return null;
  const meta = metadata as Record<string, string>;
  return (
    <div className="mt-4 border-t border-red-200 pt-4">
      <p className="text-xs font-medium text-gray-500">Betrokken instanties</p>
      <p className="mt-1 text-sm text-gray-800">
        {meta.betrokkenInstanties || "Niet opgegeven"}
      </p>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DierDetailPage({ params }: Props) {
  const { id } = await params;
  const animalId = Number(id);
  if (isNaN(animalId)) notFound();

  const [animal, attachments, kennelsList, neglectReport, behaviorRecords, behaviorRecordCount, feedingPlan, vaccinationsList, dewormingsList, vetVisitsList, operationsList, medicationsList, todayMedicationLogs, todosList, openTodoCount, walkHistory, workflowSettings, workflowHistory, animalTraitsValues] = await Promise.all([
    getAnimalById(animalId),
    getAttachmentsByAnimalId(animalId),
    getKennels(),
    getNeglectReportByAnimalId(animalId),
    getBehaviorRecordsByAnimalId(animalId),
    countBehaviorRecords(animalId),
    getFeedingPlanByAnimalId(animalId),
    getVaccinationsByAnimalId(animalId),
    getDewormingsByAnimalId(animalId),
    getVetVisitsByAnimalId(animalId),
    getOperationsByAnimalId(animalId),
    getMedicationsByAnimalId(animalId),
    getTodayMedicationLogsByAnimalId(animalId),
    getTodosByAnimalId(animalId),
    countOpenTodosByAnimalId(animalId),
    getWalkHistoryByAnimalId(animalId),
    getWorkflowSettings(),
    getWorkflowHistoryWithUserByAnimalId(animalId),
    getAnimalTraits(animalId),
  ]);

  if (!animal) notFound();

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold text-[#1b4332]">{animal.name}</h1>

      {workflowSettings.workflowEnabled && workflowSettings.stepbarVisible && animal.workflowPhase && (
        <WorkflowStepbar
          currentPhase={animal.workflowPhase}
          animalId={animalId}
          animalName={animal.name}
          animalSpecies={animal.species}
          todos={todosList}
        />
      )}

      {/* Status, Kennel, Adoptie & Uitstroom — snelle acties die meteen opslaan.
          Boven de tabbladen zodat ze altijd zichtbaar zijn, los van het tabblad. */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <h2 className="text-sm font-bold text-[#1b4332]">Status (handmatig)</h2>
          <div className="mt-2">
            <StatusChanger
              animalId={animalId}
              currentStatus={animal.status ?? "beschikbaar"}
            />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <h2 className="text-sm font-bold text-[#1b4332]">Kennel</h2>
          <div className="mt-2">
            <KennelSelector
              animalId={animalId}
              currentKennelId={animal.kennelId}
              kennels={kennelsList}
            />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <h2 className="text-sm font-bold text-[#1b4332]">Adoptie</h2>
          <div className="mt-2">
            <AdoptionToggle
              animalId={animalId}
              isAvailable={animal.isAvailableForAdoption ?? false}
            />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <h2 className="text-sm font-bold text-[#1b4332]">Uitstroom</h2>
          <div className="mt-2">
            <OuttakeForm
              animalId={animalId}
              animalName={animal.name}
              isInShelter={animal.isInShelter ?? true}
            />
          </div>
        </div>
      </div>

      <AnimalDetailTabs openTodoCount={openTodoCount}>
        {{
          overzicht: (
            <div className="space-y-4">
              <AnimalEditForm
                animal={animal}
                key={animal.updatedAt ? new Date(animal.updatedAt).getTime() : animal.id}
              />

              {/* IBN Info */}
              {animal.intakeReason === "ibn" && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <h3 className="text-sm font-bold text-red-700">Inbeslagname (IBN)</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500">Dossiernummer DWV</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">
                        {animal.dossierNr || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">PV-nummer politie</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">
                        {animal.pvNr || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Intake datum</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">
                        {animal.intakeDate || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Beslissingsdeadline (60d)</p>
                      <p className={`mt-1 text-sm font-semibold ${
                        animal.ibnDecisionDeadline &&
                        new Date(animal.ibnDecisionDeadline) <= new Date()
                          ? "text-red-700"
                          : "text-gray-800"
                      }`}>
                        {animal.ibnDecisionDeadline || "—"}
                      </p>
                    </div>
                  </div>
                  <IbnMetadata metadata={animal.intakeMetadata} />
                  <NeglectReportSection animalId={animalId} report={neglectReport} />
                </div>
              )}

              {/* Workflow-historie */}
              {workflowSettings.workflowEnabled && (
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
                  <h3 className="mb-3 text-sm font-bold text-[#1b4332]">Workflow-historie</h3>
                  <WorkflowHistorySection entries={workflowHistory} />
                </div>
              )}
            </div>
          ),

          medisch: (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <SectionCard title="Vaccinaties">
                  <VaccinationSection animalId={animalId} vaccinations={vaccinationsList} />
                </SectionCard>
                <SectionCard title="Ontworming & vlooien">
                  <DewormingSection animalId={animalId} dewormings={dewormingsList} />
                </SectionCard>
              </div>

              <SectionCard title="Dierenarts-bezoeken">
                <VetVisitSection animalId={animalId} visits={vetVisitsList} />
              </SectionCard>

              <div className="grid gap-4 lg:grid-cols-2">
                <SectionCard title="Operaties">
                  <OperationSection animalId={animalId} operations={operationsList} />
                </SectionCard>
                <SectionCard title="Medicatie">
                  <MedicationSection animalId={animalId} medications={medicationsList} todayLogs={todayMedicationLogs} />
                </SectionCard>
              </div>
            </div>
          ),

          zorg: (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <SectionCard title="Gedragsfiches">
                  <BehaviorRecordSection
                    animalId={animalId}
                    species={animal.species}
                    records={behaviorRecords}
                    recordCount={behaviorRecordCount}
                  />
                </SectionCard>
                <SectionCard title="Voedingsplan">
                  <FeedingPlanSection animalId={animalId} plan={feedingPlan} />
                </SectionCard>
              </div>

              <SectionCard title="Eigenschappen & affiche">
                <AnimalTraitsSection animalId={animalId} traits={animalTraitsValues} />
              </SectionCard>

              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    To-do Lijst
                  </h3>
                  {openTodoCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      {openTodoCount} open
                    </span>
                  )}
                </div>
                <TodoSection animalId={animalId} todos={todosList} />
              </div>

              {/* Wandelgeschiedenis (alleen voor honden) */}
              {animal.species === "hond" && (
                <SectionCard title="Wandelgeschiedenis">
                  <WalkHistorySection
                    entries={walkHistory}
                    stats={computeWalkStats(walkHistory, "walkerName")}
                    animalId={animalId}
                    companionLabel="Meest frequente wandelaar"
                  />
                </SectionCard>
              )}
            </div>
          ),

          bestanden: (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
                <FileUpload animalId={animalId} />
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
                <AttachmentGallery
                  attachments={attachments}
                  currentMainPhoto={animal.imageUrl}
                />
              </div>
            </div>
          ),
        }}
      </AnimalDetailTabs>
    </div>
  );
}
