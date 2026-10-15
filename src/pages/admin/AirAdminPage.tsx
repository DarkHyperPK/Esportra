import { useState } from "react";
import { useAirAdminList, useAirOverview } from "@/hooks/useAirAdmin";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { AirAdminRow, AirAdminSection } from "@/types/air";
import AirAdminForm from "@/components/air/AirAdminForm";
import AirAdminTable from "@/components/air/AirAdminTable";
import "@/components/air/air-workspace.css";
const sections: AirAdminSection[] = [
  "customers",
  "workspaces",
  "plans",
  "devices",
  "activity",
  "releases",
];
export default function AirAdminPage() {
  const [section, setSection] = useState<AirAdminSection>("customers"),
    [page, setPage] = useState(1),
    [edit, setEdit] = useState<AirAdminRow | null | undefined>(),
    [search, setSearch] = useState("");
  const overview = useAirOverview(),
    list = useAirAdminList(section, page),
    rows =
      list.data?.items.filter((row) =>
        JSON.stringify(row).toLowerCase().includes(search.toLowerCase()),
      ) ?? [];
  return (
    <main className="air-web">
      <header>
        <div>
          <small>SUPER ADMIN · ESPORTRA AIR</small>
          <h1>Broadcast operations.</h1>
          <p>
            Account access, independent workspaces and production device health.
            Raw game packets stay on the production PC.
          </p>
        </div>
        {(section === "plans" || section === "releases") && (
          <button className="air-primary" onClick={() => setEdit(null)}>
            Add {section === "plans" ? "plan" : "release"}
          </button>
        )}
      </header>
      {overview.data && (
        <>
          <div className="air-stats">
            {Object.entries(overview.data.counts).map(([label, value]) => (
              <div key={label}>
                <strong>{value}</strong>
                <small>{label.replace(/([A-Z])/g, " $1")}</small>
              </div>
            ))}
          </div>
          {!overview.data.offlineSigningConfigured && (
            <p className="air-notice">
              Offline signing is not configured. Online access works; configure
              the persistent signing key before relying on cached access.
            </p>
          )}
        </>
      )}
      <nav aria-label="Esportra Air administration">
        {sections.map((value) => (
          <button
            aria-pressed={section === value}
            key={value}
            onClick={() => {
              setSection(value);
              setPage(1);
              setEdit(undefined);
              setSearch("");
            }}
          >
            {value === "customers"
              ? "Customers & licenses"
              : value === "activity"
                ? "Audit history"
                : value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </nav>
      {(overview.error || list.error) && (
        <p role="alert" className="air-notice">
          {getApiErrorMessage(overview.error || list.error)}{" "}
          <button
            onClick={() => {
              void overview.refetch();
              void list.refetch();
            }}
          >
            Retry
          </button>
        </p>
      )}
      {edit !== undefined && (
        <AirAdminForm
          key={`${section}-${edit?.id ?? edit?.userId ?? "new"}`}
          section={section}
          row={edit}
          onClose={() => setEdit(undefined)}
        />
      )}
      <label>
        Filter this page
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search displayed records"
        />
      </label>
      {list.isPending ? (
        <p role="status">Loading Air records…</p>
      ) : !rows.length ? (
        <section>
          <h2>No {section} to show</h2>
          <p>
            {search
              ? "Try another filter."
              : "Records appear as customers sign in, create projects and connect devices."}
          </p>
        </section>
      ) : (
        <AirAdminTable section={section} rows={rows} onEdit={setEdit} />
      )}
      <div className="air-actions py-5">
        <button
          disabled={page === 1 || list.isFetching}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          disabled={!list.data?.hasMore || list.isFetching}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </button>
      </div>
      <p>
        Manual grants and extensions only. Changes require a reason where
        relevant and are recorded in audit history.
      </p>
    </main>
  );
}
