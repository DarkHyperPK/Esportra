import type { AirAdminRow, AirAdminSection } from "@/types/air";
interface Props {
  section: AirAdminSection;
  rows: AirAdminRow[];
  onEdit: (row: AirAdminRow) => void;
}
const date = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "—";
export default function AirAdminTable({ section, rows, onEdit }: Props) {
  const headers: Record<AirAdminSection, string[]> = {
    customers: ["Account / license", "Plan", "Access", "Expires", "Actions"],
    workspaces: ["Workspace", "Owner", "Projects", "Created"],
    plans: ["Plan", "Production PCs", "Capture PCs", "Status", "Actions"],
    devices: [
      "Device",
      "Account",
      "Role / status",
      "Last seen / health",
      "Actions",
    ],
    activity: ["Action", "Actor", "Subject", "Reason", "Time"],
    releases: [
      "Version",
      "Channel",
      "Published",
      "Download / notes",
      "Actions",
    ],
  };
  return (
    <div className="air-scroll">
      <table>
        <thead>
          <tr>
            {headers[section].map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? row.userId ?? index}>
              {section === "customers" && (
                <>
                  <td>
                    <code>{row.userId}</code>
                    <small>{row.licenseCode}</small>
                  </td>
                  <td>{row.plan}</td>
                  <td>
                    {row.status}
                    <small>Trial ends {date(row.trialEndsAt)}</small>
                  </td>
                  <td>{row.validUntil ? date(row.validUntil) : "No expiry"}</td>
                  <td>
                    <button onClick={() => onEdit(row)}>Manage access</button>
                  </td>
                </>
              )}
              {section === "workspaces" && (
                <>
                  <td>
                    {row.name}
                    <small>{row.id}</small>
                  </td>
                  <td>
                    <code>{row.ownerId}</code>
                  </td>
                  <td>{row.projects}</td>
                  <td>{date(row.createdAt)}</td>
                </>
              )}
              {section === "plans" && (
                <>
                  <td>{row.name}</td>
                  <td>{row.productionLimit ?? "Unrestricted"}</td>
                  <td>{row.captureLimit ?? "Unrestricted"}</td>
                  <td>{row.enabled ? "Enabled" : "Disabled"}</td>
                  <td>
                    <button onClick={() => onEdit(row)}>Edit plan</button>
                  </td>
                </>
              )}
              {section === "devices" && (
                <>
                  <td>
                    {row.name}
                    <small>{row.id}</small>
                  </td>
                  <td>
                    <code>{row.userId}</code>
                  </td>
                  <td>
                    {row.mode}
                    <small>{row.status}</small>
                  </td>
                  <td>
                    {date(row.lastSeenAt)}
                    <small>{health(row.health)}</small>
                  </td>
                  <td>
                    <button
                      disabled={row.status === "revoked"}
                      onClick={() => onEdit(row)}
                    >
                      Revoke device
                    </button>
                  </td>
                </>
              )}
              {section === "activity" && (
                <>
                  <td>{row.action}</td>
                  <td>
                    <code>{row.actorId}</code>
                  </td>
                  <td>
                    <code>{row.subjectId}</code>
                  </td>
                  <td>{row.reason}</td>
                  <td>{date(row.createdAt)}</td>
                </>
              )}
              {section === "releases" && (
                <>
                  <td>{row.version}</td>
                  <td>{row.channel}</td>
                  <td>{row.published ? "Published" : "Draft"}</td>
                  <td>
                    {row.downloadUrl && (
                      <a
                        className="underline"
                        href={row.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download
                      </a>
                    )}
                    <small>{row.notes}</small>
                  </td>
                  <td>
                    <button onClick={() => onEdit(row)}>Edit release</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function health(value?: string) {
  if (!value) return "No health report";
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return "No health report";
    return Object.entries(parsed)
      .map(([key, item]) => `${key}: ${String(item)}`)
      .join(" · ");
  } catch {
    return "Health report unavailable";
  }
}
