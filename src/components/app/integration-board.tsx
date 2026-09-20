"use client";

import { useEffect, useState } from "react";
import { useIntegrations } from "@/components/app/use-integrations";
import type {
  CredentialFieldHint,
  IntegrationConnectionView,
  IntegrationSnapshot,
  PosProviderId,
} from "@/lib/integrations/types";
import { SYNC_INTERVALS } from "@/lib/integrations/types";

function when(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

export function IntegrationBoard({
  companyId,
  locationId,
  companyName,
  initial,
}: {
  companyId: string;
  locationId: string;
  companyName: string;
  initial: IntegrationSnapshot;
}) {
  const { snapshot, error, pending, save, sync } = useIntegrations(companyId, locationId, initial);
  const [selected, setSelected] = useState<PosProviderId>("MANUAL");
  const provider = snapshot.providers.find((item) => item.id === selected) ?? snapshot.providers[0];
  const connection = snapshot.connections.find((item) => item.provider === selected);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-800">
          Integrations · {companyName}
        </p>
        <h1 className="font-display mt-2 text-4xl text-stone-950">{snapshot.restaurantName}</h1>
        <p className="mt-2 max-w-3xl text-stone-600">
          Manual is the first live POS adapter. It imports sales, orders, menu items, employees, and payments into
          LiveShift models. A failed source never deletes restaurant data.
        </p>
      </div>

      {error ? <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-950">{error}</p> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.providers.map((item) => {
          const existing = snapshot.connections.find((connectionItem) => connectionItem.provider === item.id);
          const active = item.id === selected;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              className={`rounded-3xl border px-4 py-4 text-left ${
                active ? "border-[#1c1410] bg-white" : "border-stone-200 bg-[#faf6ef]"
              }`}
            >
              <p className="font-display text-2xl text-stone-950">{item.label}</p>
              <p className="mt-2 text-sm text-stone-600">{item.implemented ? "Adapter ready" : "Adapter stub"}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">
                {existing?.syncStatus.toLowerCase() ?? "not connected"}
              </p>
            </button>
          );
        })}
      </section>

      {provider ? (
        <ProviderPanel
          provider={provider}
          connection={connection}
          canWrite={snapshot.canWrite}
          pending={pending}
          onSave={save}
          onSync={sync}
        />
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-5 py-4">
          <h2 className="font-display text-2xl text-stone-950">Error logs</h2>
          <p className="mt-1 text-sm text-stone-500">Every attempt is recorded. Failed imports leave existing data in place.</p>
        </div>
        {snapshot.logs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-stone-500">No sync attempts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#faf6ef] text-xs uppercase tracking-[0.14em] text-stone-500">
                <tr>
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Trigger</th>
                  <th className="px-5 py-3">Resource</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Records</th>
                  <th className="px-5 py-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.logs.map((log) => (
                  <tr key={log.id} className="border-t border-stone-100">
                    <td className="px-5 py-3 text-stone-700">{new Date(log.startedAt).toLocaleString()}</td>
                    <td className="px-5 py-3">{log.trigger}</td>
                    <td className="px-5 py-3">{log.resource}</td>
                    <td className="px-5 py-3">{log.status}</td>
                    <td className="px-5 py-3">
                      {log.recordsImported}/{log.recordsFetched}
                    </td>
                    <td className="px-5 py-3 text-stone-500">{log.errorMessage ?? log.errorCode ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ProviderPanel({
  provider,
  connection,
  canWrite,
  pending,
  onSave,
  onSync,
}: {
  provider: IntegrationSnapshot["providers"][number];
  connection?: IntegrationConnectionView;
  canWrite: boolean;
  pending: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<boolean>;
  onSync: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [externalLocationId, setExternalLocationId] = useState(connection?.externalLocationId ?? "");
  const [sourceUrl, setSourceUrl] = useState(connection?.sourceUrl ?? "");
  const [useSampleData, setUseSampleData] = useState(connection?.useSampleData ?? false);
  const [scheduledEnabled, setScheduledEnabled] = useState(connection?.scheduledEnabled ?? false);
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(connection?.syncIntervalMinutes ?? 15);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setExternalLocationId(connection?.externalLocationId ?? "");
    setSourceUrl(connection?.sourceUrl ?? "");
    setUseSampleData(connection?.useSampleData ?? false);
    setScheduledEnabled(connection?.scheduledEnabled ?? false);
    setSyncIntervalMinutes(connection?.syncIntervalMinutes ?? 15);
    setValues({});
  }, [provider.id, connection?.id, connection?.updatedAt]);

  const settingsPayload = {
    provider: provider.id,
    externalLocationId: externalLocationId || null,
    sourceUrl: sourceUrl || null,
    useSampleData,
    scheduledEnabled,
    syncIntervalMinutes,
    credentials: values,
    status: "READY" as const,
  };

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-stone-950">Integration settings</h2>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            {provider.implemented
              ? "Imports map into LiveShift sales, staffing, menu, order, and payment records."
              : `${provider.label} is registered but not implemented yet.`}
          </p>
        </div>
        <span className="rounded-full bg-[#1c1410] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[#fff6ea]">
          {connection?.syncStatus ?? "DISABLED"}
        </span>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Sync status" value={connection?.syncStatus ?? "Not connected"} />
        <Stat label="Last successful sync" value={when(connection?.lastSuccessfulSyncAt ?? null)} />
        <Stat label="Last attempt" value={when(connection?.lastSyncedAt ?? null)} />
        <Stat label="Next scheduled sync" value={connection?.scheduledEnabled ? when(connection.nextSyncAt) : "Off"} />
      </dl>
      {connection?.lastError ? (
        <p className="mt-3 rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-950">{connection.lastError}</p>
      ) : null}

      <form
        className="mt-6 grid gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canWrite) return;
          void onSave(settingsPayload);
        }}
      >
        <label className="text-xs uppercase tracking-[0.14em] text-stone-500">
          External location ID
          <input
            value={externalLocationId}
            onChange={(event) => setExternalLocationId(event.target.value)}
            disabled={!canWrite}
            className="mt-1 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:opacity-60"
          />
        </label>
        <label className="text-xs uppercase tracking-[0.14em] text-stone-500">
          Source URL
          <input
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            disabled={!canWrite || !provider.implemented}
            placeholder="https://example.com/pos-export.json"
            className="mt-1 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:opacity-60"
          />
        </label>
        {provider.credentialFields.map((field) => (
          <CredentialInput
            key={field.key}
            field={field}
            saved={connection?.credentialFields.includes(field.key) ?? false}
            value={values[field.key] ?? ""}
            disabled={!canWrite || !provider.implemented}
            onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
          />
        ))}
        <label className="flex items-center gap-3 text-sm text-stone-700 md:col-span-2">
          <input
            type="checkbox"
            checked={useSampleData}
            disabled={!canWrite || !provider.implemented}
            onChange={(event) => setUseSampleData(event.target.checked)}
          />
          Use sample POS export
        </label>
        <label className="flex items-center gap-3 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={scheduledEnabled}
            disabled={!canWrite || !provider.implemented}
            onChange={(event) => setScheduledEnabled(event.target.checked)}
          />
          Scheduled sync
        </label>
        <label className="text-xs uppercase tracking-[0.14em] text-stone-500">
          Interval
          <select
            value={syncIntervalMinutes}
            disabled={!canWrite || !provider.implemented}
            onChange={(event) => setSyncIntervalMinutes(Number(event.target.value))}
            className="mt-1 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:opacity-60"
          >
            {SYNC_INTERVALS.map((minutes) => (
              <option key={minutes} value={minutes}>
                Every {minutes >= 60 ? `${minutes / 60} hour${minutes / 60 === 1 ? "" : "s"}` : `${minutes} minutes`}
              </option>
            ))}
          </select>
        </label>
        {canWrite ? (
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-[#1c1410] px-4 py-2 text-sm text-[#fff6ea] disabled:opacity-60"
            >
              Save settings
            </button>
            <button
              type="button"
              disabled={pending || !connection || !provider.implemented}
              onClick={() => (connection ? void onSync({ connectionId: connection.id, resource: "ALL", trigger: "MANUAL" }) : undefined)}
              className="rounded-xl border border-stone-300 px-4 py-2 text-sm text-stone-800 disabled:opacity-60"
            >
              Sync now
            </button>
            {connection ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => void onSave({ provider: provider.id, status: "DISABLED", scheduledEnabled: false })}
                className="rounded-xl px-4 py-2 text-sm text-stone-600"
              >
                Disable
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-stone-500 md:col-span-2">Only general managers can change integration settings.</p>
        )}
      </form>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#faf6ef] px-4 py-3">
      <dt className="text-xs uppercase tracking-[0.14em] text-stone-500">{label}</dt>
      <dd className="mt-1 text-sm text-stone-900">{value}</dd>
    </div>
  );
}

function CredentialInput({
  field,
  saved,
  value,
  disabled,
  onChange,
}: {
  field: CredentialFieldHint;
  saved: boolean;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const classes =
    "mt-1 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:opacity-60";
  return (
    <label className={`text-xs uppercase tracking-[0.14em] text-stone-500 ${field.multiline ? "md:col-span-2" : ""}`}>
      {field.label}
      {saved ? <span className="ml-2 text-[10px] tracking-normal text-emerald-800">saved</span> : null}
      {field.multiline ? (
        <textarea
          value={value}
          placeholder={saved ? "••••••••" : '{"sales":[],"orders":[]}'}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          rows={6}
          className={classes}
        />
      ) : (
        <input
          type={field.secret ? "password" : "text"}
          value={value}
          placeholder={saved ? "••••••••" : ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          autoComplete="off"
          className={classes}
        />
      )}
    </label>
  );
}
