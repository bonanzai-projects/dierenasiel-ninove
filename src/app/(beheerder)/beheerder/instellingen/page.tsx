import { getWorkflowSettings } from "@/lib/queries/shelter-settings";
import { getWalkingClubThreshold, getWalkDays, getShelterCaregivers } from "@/lib/queries/shelter-settings";
import WorkflowSettingsPanel from "@/components/beheerder/instellingen/WorkflowSettingsPanel";
import ThresholdSettingPanel from "@/components/beheerder/instellingen/ThresholdSettingPanel";
import WalkDaysSettingPanel from "@/components/beheerder/instellingen/WalkDaysSettingPanel";
import CaregiversSettingPanel from "@/components/beheerder/instellingen/CaregiversSettingPanel";
import DatabaseResetPanel from "@/components/beheerder/instellingen/DatabaseResetPanel";
import DatabaseBackupPanel from "@/components/beheerder/instellingen/DatabaseBackupPanel";
import { getBackups } from "@/lib/queries/database-backups";

export default async function InstellingenPage() {
  const [workflowSettings, threshold, walkDays, caregivers, backups] = await Promise.all([
    getWorkflowSettings(),
    getWalkingClubThreshold(),
    getWalkDays(),
    getShelterCaregivers(),
    getBackups(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1b4332]">
          Instellingen
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Beheer de configuratie van het asiel-systeem.
        </p>
      </div>

      <section className="mt-6">
        <WorkflowSettingsPanel settings={workflowSettings} />
      </section>

      <section className="mt-6">
        <ThresholdSettingPanel threshold={threshold} />
      </section>

      <section className="mt-6">
        <WalkDaysSettingPanel walkDays={walkDays} />
      </section>

      <section className="mt-6">
        <CaregiversSettingPanel caregivers={caregivers} />
      </section>

      <section className="mt-6">
        <DatabaseBackupPanel backups={backups} />
      </section>

      <section className="mt-6">
        <DatabaseResetPanel />
      </section>
    </div>
  );
}
