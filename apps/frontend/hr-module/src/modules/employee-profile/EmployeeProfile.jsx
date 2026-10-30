import { useEffect, useState } from "react";
import { apiBlob, apiRequest } from "../../api";
import { secondaryButton, useAction, useApi } from "../helpers";
import { Notice, Panel } from "../ui";
import { TABS } from "./constants";
import { profilePath } from "./utils";
import { EmploymentEditModal, SummaryCard } from "./shared";
import { PersonalTab } from "./tabs/PersonalTab";
import { EmploymentTab } from "./tabs/EmploymentTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { SalaryTab } from "./tabs/SalaryTab";
import { AttendanceTab } from "./tabs/AttendanceTab";
import { LeaveTab } from "./tabs/LeaveTab";
export function EmployeeProfile({ companyId, employeeId, ownEmployeeId, employees = [], onBack, onEmployeeUpdated }) {
  const [tab, setTab] = useState("Personal Info");
  const [editing, setEditing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoError, setPhotoError] = useState("");
  const profile = useApi(employeeId ? profilePath(employeeId, "/profile", companyId) : null);
  const photoAction = useAction();
  const data = profile.data;
  const photoId = data?.photoDocumentId;

  useEffect(() => {
    if (!photoId) return undefined;
    let url = "";
    let cancelled = false;
    apiBlob(profilePath(employeeId, `/documents/${photoId}`, companyId))
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPhotoUrl(url);
        setPhotoError("");
      })
      .catch((error) => { if (!cancelled) setPhotoError(error.message); });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setPhotoUrl("");
    };
  }, [photoId, employeeId, companyId]);

  if (!employeeId) return <Notice notice={{ type: "info", message: "Select an employee from the directory to view their profile." }} />;
  if (profile.loading && !data) return <Panel><p className="text-sm text-muted">Loading profile…</p></Panel>;
  if (profile.error) {
    return (
      <div className="space-y-3">
        <Notice notice={{ type: "error", message: profile.error }} />
        <button type="button" onClick={profile.reload} className={secondaryButton}>Retry</button>
      </div>
    );
  }
  if (!data) return null;

  const manager = data.access === "manager";
  const self = data.access === "self";
  const isOwn = self || (Boolean(ownEmployeeId) && String(ownEmployeeId) === String(employeeId));
  const refresh = () => { profile.reload(); onEmployeeUpdated?.(); };

  async function uploadPhoto(file) {
    const body = new FormData();
    body.append("file", file);
    body.append("category", "Photo");
    body.append("title", "Profile photo");
    const result = await photoAction.run(() => apiRequest(profilePath(employeeId, "/documents", companyId), { method: "POST", body }), "Photo updated.");
    if (result) profile.reload();
  }

  return (
    <section className="space-y-5">
      {onBack && (
        <button type="button" onClick={onBack} className="inline-flex items-center rounded-md text-sm font-semibold text-link hover:underline">
          ← Back to Employee Directory
        </button>
      )}
      <Notice notice={photoAction.notice} onClose={() => photoAction.setNotice(null)} />
      {photoError && <Notice notice={{ type: "error", message: `Profile photo could not be loaded: ${photoError}` }} />}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <SummaryCard
          data={data}
          photoUrl={photoUrl}
          canUploadPhoto={manager || self}
          onPhotoSelected={uploadPhoto}
          onPhotoError={() => { setPhotoUrl(""); setPhotoError("the stored file is not a displayable image. Upload a new photo."); }}
          uploading={photoAction.busy}
        />
        <div className="min-w-0 space-y-4">
          {data.access === "directory" ? (
            <Notice notice={{ type: "info", message: "Only directory details are shown for colleagues. Personal, salary, attendance, leave and document records are visible to HR and the employee." }} />
          ) : (
            <>
              <div role="tablist" aria-label="Profile sections" className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
                {TABS.map((name) => (
                  <button
                    key={name}
                    role="tab"
                    type="button"
                    aria-selected={tab === name}
                    onClick={() => setTab(name)}
                    className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${tab === name ? "bg-brand text-surface" : "border border-line bg-surface text-ink-soft hover:bg-surface-muted"}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div role="tabpanel" aria-label={tab}>
                {tab === "Personal Info" && <PersonalTab companyId={companyId} data={data} manager={manager} canSelfEdit={self} reload={profile.reload} onEdit={() => setEditing(true)} />}
                {tab === "Employment" && <EmploymentTab companyId={companyId} data={data} manager={manager} reload={profile.reload} onEdit={() => setEditing(true)} />}
                {tab === "Documents" && <DocumentsTab companyId={companyId} employeeId={employeeId} manager={manager} isOwn={isOwn} onPhotoChanged={profile.reload} />}
                {tab === "Salary" && <SalaryTab companyId={companyId} employeeId={employeeId} />}
                {tab === "Attendance" && <AttendanceTab companyId={companyId} employeeId={employeeId} />}
                {tab === "Leave" && <LeaveTab companyId={companyId} employeeId={employeeId} />}
              </div>
            </>
          )}
        </div>
      </div>
      {editing && (
        <EmploymentEditModal
          companyId={companyId}
          employee={data.employee}
          employees={employees}
          onClose={(saved) => { setEditing(false); if (saved) refresh(); }}
        />
      )}
    </section>
  );
}
