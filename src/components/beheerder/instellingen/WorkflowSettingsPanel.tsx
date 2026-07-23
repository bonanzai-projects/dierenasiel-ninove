"use client";

import { useState, useTransition, useOptimistic, type ReactNode } from "react";
import { updateShelterSetting } from "@/lib/actions/shelter-settings";
import InfoButton from "@/components/beheerder/shared/InfoButton";
import WorkflowInfo from "./WorkflowInfo";
import type { WorkflowSettings } from "@/lib/validations/shelter-settings";

interface Props {
  settings: WorkflowSettings;
}

export default function WorkflowSettingsPanel({ settings }: Props) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(settings);
  const [error, setError] = useState<string | null>(null);

  function handleToggle(key: string, currentValue: boolean) {
    setError(null);
    startTransition(async () => {
      const newValue = !currentValue;
      setOptimistic((prev) => {
        switch (key) {
          case "workflow_enabled":
            return { ...prev, workflowEnabled: newValue };
          case "workflow_stepbar_visible":
            return { ...prev, stepbarVisible: newValue };
          case "workflow_auto_actions_enabled":
            return { ...prev, autoActionsEnabled: newValue };
          default:
            return prev;
        }
      });
      const result = await updateShelterSetting(key, newValue);
      if (!result.success) {
        setError(result.error ?? "Er ging iets mis.");
      }
    });
  }

  const masterEnabled = optimistic.workflowEnabled;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-[#1b4332]">
        Workflow Engine
      </h3>
      <p className="mb-6 text-sm text-gray-500">
        Configureer de workflow-automatisering voor het dierenasiel.
      </p>

      <div className="space-y-4">
        {/* Master toggle */}
        <ToggleRow
          label="Workflow ingeschakeld"
          description="Master toggle — schakelt de hele workflow-feature in of uit"
          checked={optimistic.workflowEnabled}
          disabled={isPending}
          onChange={() => handleToggle("workflow_enabled", optimistic.workflowEnabled)}
          info={
            <InfoButton title="Wat doet de workflow?" label="Uitleg over de workflow">
              <WorkflowInfo />
            </InfoButton>
          }
        />

        {/* Stepbar toggle */}
        <ToggleRow
          label="Stappenbalk zichtbaar"
          description="Toon de workflow-stappenbalk op de dierdetailpagina"
          checked={optimistic.stepbarVisible}
          disabled={isPending || !masterEnabled}
          onChange={() => handleToggle("workflow_stepbar_visible", optimistic.stepbarVisible)}
        />

        {/* Auto-actions toggle */}
        <ToggleRow
          label="Automatische acties"
          description="Maak automatisch taken aan bij fase-overgangen"
          checked={optimistic.autoActionsEnabled}
          disabled={isPending || !masterEnabled}
          onChange={() => handleToggle("workflow_auto_actions_enabled", optimistic.autoActionsEnabled)}
        />
      </div>

      {!masterEnabled && (
        <p className="mt-4 text-xs text-amber-600">
          De workflow-feature is uitgeschakeld. Stappenbalk en automatische acties zijn niet beschikbaar.
        </p>
      )}

      {error && (
        <p className="mt-4 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
  info,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  /** Optionele uitleg-knop naast het label. */
  info?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-gray-100 px-4 py-3">
      <div>
        {/* <div> en geen <p>: de uitleg-knop rendert een <dialog>, en dat mag
            volgens de HTML-regels niet binnen een paragraaf staan. */}
        <div className={`flex items-center gap-2 text-sm font-medium ${disabled ? "text-gray-400" : "text-gray-900"}`}>
          {label}
          {info}
        </div>
        <p className={`text-xs ${disabled ? "text-gray-300" : "text-gray-500"}`}>
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] focus:ring-offset-2 ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        } ${checked ? "bg-[#2d6a4f]" : "bg-gray-200"}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
