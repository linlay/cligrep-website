import { useEffect, useRef, useState, type FormEvent } from "react";
import { request } from "../lib/api";
import { formatCliDateTime } from "../lib/cliView";
import { useAuth } from "../hooks/useAuth";
import type {
  AdminAssetUploadResult,
  AdminCliDetailPayload,
  AdminMe,
  CliRecord,
  CliRelease,
  CliReleaseAsset,
  ExecutionTemplate,
} from "../types";

interface AdminCliForm {
  slug: string;
  displayName: string;
  summary: string;
  helpText: string;
  versionText: string;
  exampleLine: string;
  author: string;
  githubUrl: string;
  giteeUrl: string;
  license: string;
  originalCommand: string;
  executionTemplate: string;
  tags: string;
}

interface AdminReleaseForm {
  version: string;
  publishedAt: string;
  isCurrent: boolean;
  sourceKind: string;
  sourceUrl: string;
}

interface AdminAssetForm {
  os: string;
  arch: string;
  packageKind: string;
  checksumUrl: string;
}

function emptyCliForm(): AdminCliForm {
  return {
    slug: "",
    displayName: "",
    summary: "",
    helpText: "",
    versionText: "",
    exampleLine: "",
    author: "",
    githubUrl: "",
    giteeUrl: "",
    license: "",
    originalCommand: "",
    executionTemplate: "download-only",
    tags: "",
  };
}

function asReleaseList(value: unknown): CliRelease[] {
  return Array.isArray(value) ? (value as CliRelease[]) : [];
}

function asExecutionTemplateList(value: unknown): ExecutionTemplate[] {
  return Array.isArray(value) ? (value as ExecutionTemplate[]) : [];
}

function asAssetList(value: unknown): CliReleaseAsset[] {
  return Array.isArray(value) ? (value as CliReleaseAsset[]) : [];
}

function emptyReleaseForm(): AdminReleaseForm {
  return {
    version: "",
    publishedAt: new Date().toISOString().slice(0, 16),
    isCurrent: false,
    sourceKind: "manual",
    sourceUrl: "",
  };
}

function emptyAssetForm(): AdminAssetForm {
  return {
    os: "",
    arch: "",
    packageKind: "",
    checksumUrl: "",
  };
}

function readSelectedSlug(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug")?.trim() ?? "";
}

function writeSelectedSlug(slug: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (slug) {
    params.set("slug", slug);
  } else {
    params.delete("slug");
  }
  const nextURL = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", nextURL);
}

function toCliForm(cli: CliRecord | null | undefined): AdminCliForm {
  if (!cli) return emptyCliForm();
  return {
    slug: typeof cli.slug === "string" ? cli.slug : "",
    displayName: typeof cli.displayName === "string" ? cli.displayName : "",
    summary: typeof cli.summary === "string" ? cli.summary : "",
    helpText: typeof cli.helpText === "string" ? cli.helpText : "",
    versionText: typeof cli.versionText === "string" ? cli.versionText : "",
    exampleLine: typeof cli.exampleLine === "string" ? cli.exampleLine : "",
    author: typeof cli.author === "string" ? cli.author : "",
    githubUrl: typeof cli.githubUrl === "string" ? cli.githubUrl : "",
    giteeUrl: typeof cli.giteeUrl === "string" ? cli.giteeUrl : "",
    license: typeof cli.license === "string" ? cli.license : "",
    originalCommand:
      typeof cli.originalCommand === "string" ? cli.originalCommand : "",
    executionTemplate:
      typeof cli.executionTemplate === "string" && cli.executionTemplate
        ? cli.executionTemplate
        : "download-only",
    tags: Array.isArray(cli.tags)
      ? cli.tags.filter((item): item is string => typeof item === "string").join(", ")
      : "",
  };
}

function toReleaseForm(release: CliRelease | null | undefined): AdminReleaseForm {
  if (!release) return emptyReleaseForm();
  return {
    version: typeof release.version === "string" ? release.version : "",
    publishedAt:
      typeof release.publishedAt === "string" && release.publishedAt
        ? release.publishedAt.slice(0, 16)
        : new Date().toISOString().slice(0, 16),
    isCurrent: Boolean(release.isCurrent),
    sourceKind: typeof release.sourceKind === "string" ? release.sourceKind : "manual",
    sourceUrl: typeof release.sourceUrl === "string" ? release.sourceUrl : "",
  };
}

function displayCountLabel(value: unknown): string {
  const count = Number(value);
  return Number.isFinite(count) ? String(count) : "0";
}

function statusTone(status: unknown): "draft" | "published" {
  return status === "published" ? "published" : "draft";
}

function formatBytes(value: unknown): string {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let current = size;
  let unitIndex = 0;
  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }
  return `${current.toFixed(current >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function AdminConsole() {
  const {
    activeUser,
    authChecked,
    isAnonymous,
    login,
    loginLocal,
    logout,
    registerLocal,
  } = useAuth();
  const [adminMe, setAdminMe] = useState<AdminMe | null>(null);
  const [items, setItems] = useState<CliRecord[]>([]);
  const [detail, setDetail] = useState<AdminCliDetailPayload | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string>(() => readSelectedSlug());
  const [editingNewCli, setEditingNewCli] = useState(false);
  const [cliForm, setCliForm] = useState<AdminCliForm>(emptyCliForm);
  const [releaseForm, setReleaseForm] = useState<AdminReleaseForm>(emptyReleaseForm);
  const [assetForm, setAssetForm] = useState<AdminAssetForm>(emptyAssetForm);
  const [selectedReleaseVersion, setSelectedReleaseVersion] = useState("");
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loginMode, setLoginMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({
    username: "",
    password: "",
    displayName: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const releaseList = asReleaseList(detail?.releases);
  const adminExecutionTemplates = asExecutionTemplateList(adminMe?.executionTemplates);
  const detailExecutionTemplates = asExecutionTemplateList(detail?.executionTemplates);
  const executionTemplates =
    adminExecutionTemplates.length > 0
      ? adminExecutionTemplates
      : detailExecutionTemplates;
  const selectedRelease =
    releaseList.find((release) => release.version === selectedReleaseVersion) ??
    null;
  const locale = navigator.language || "en";

  useEffect(() => {
    if (!authChecked || isAnonymous) {
      setAdminMe(null);
      return;
    }

    let cancelled = false;
    async function loadAdminMe() {
      try {
        const payload = await request<AdminMe>("/api/v1/admin/me");
        if (!cancelled) {
          setAdminMe(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setAdminMe(null);
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      }
    }

    void loadAdminMe();
    return () => {
      cancelled = true;
    };
  }, [authChecked, isAnonymous]);

  useEffect(() => {
    if (!adminMe?.canAccessAdmin) return;
    void loadCliList();
  }, [adminMe?.canAccessAdmin]);

  useEffect(() => {
    if (!adminMe?.canAccessAdmin) return;
    if (!selectedSlug) {
      setDetail(null);
      setCliForm(emptyCliForm());
      setReleaseForm(emptyReleaseForm());
      setSelectedReleaseVersion("");
      return;
    }
    void loadCliDetail(selectedSlug);
  }, [selectedSlug, adminMe?.canAccessAdmin]);

  async function loadCliList() {
    try {
      const payload = await request<{ items: CliRecord[] }>("/api/v1/admin/clis");
      setItems(payload.items ?? []);
      if (!selectedSlug && payload.items?.length) {
        const firstSlug =
          typeof payload.items[0]?.slug === "string" ? payload.items[0].slug : "";
        if (firstSlug) {
          setSelectedSlug(firstSlug);
          writeSelectedSlug(firstSlug);
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    }
  }

  async function loadCliDetail(slug: string) {
    try {
      const payload = await request<AdminCliDetailPayload>(`/api/v1/admin/clis/${slug}`);
      setDetail(payload);
      setEditingNewCli(false);
      setCliForm(toCliForm(payload.cli));
      const releases = asReleaseList(payload.releases);
      const currentRelease =
        releases.find((release) => Boolean(release.isCurrent)) ??
        releases[0] ??
        null;
      setSelectedReleaseVersion(typeof currentRelease?.version === "string" ? currentRelease.version : "");
      setReleaseForm(toReleaseForm(currentRelease));
      setAssetForm(emptyAssetForm());
      setAssetFile(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    }
  }

  function beginCreateCli() {
    setEditingNewCli(true);
    setDetail(null);
    setCliForm(emptyCliForm());
    setSelectedSlug("");
    setReleaseForm(emptyReleaseForm());
    setSelectedReleaseVersion("");
    setAssetForm(emptyAssetForm());
    setAssetFile(null);
    writeSelectedSlug(null);
    setMessage("");
    setError("");
  }

  function handleSelectCli(slug: string) {
    setEditingNewCli(false);
    setSelectedSlug(slug);
    writeSelectedSlug(slug);
    setMessage("");
    setError("");
  }

  async function handleSaveCli(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...cliForm,
        tags: cliForm.tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      const response = editingNewCli
        ? await request<{ cli: CliRecord }>("/api/v1/admin/clis", {
            method: "POST",
            body: JSON.stringify(payload),
          })
        : await request<{ cli: CliRecord }>(`/api/v1/admin/clis/${selectedSlug}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });

      const nextSlug =
        typeof response.cli.slug === "string" ? response.cli.slug : selectedSlug;
      setMessage(editingNewCli ? "CLI created." : "CLI updated.");
      await loadCliList();
      if (nextSlug) {
        setSelectedSlug(nextSlug);
        writeSelectedSlug(nextSlug);
        await loadCliDetail(nextSlug);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePublish(nextAction: "publish" | "unpublish") {
    if (!selectedSlug) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request<{ cli: CliRecord }>(`/api/v1/admin/clis/${selectedSlug}/${nextAction}`, {
        method: "POST",
      });
      await loadCliList();
      await loadCliDetail(selectedSlug);
      setMessage(nextAction === "publish" ? "CLI published." : "CLI moved back to draft.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : String(actionError));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteCli() {
    if (!selectedSlug || !window.confirm(`Delete CLI "${selectedSlug}"?`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request(`/api/v1/admin/clis/${selectedSlug}`, { method: "DELETE" });
      setMessage("CLI deleted.");
      const nextItems = items.filter((item) => item.slug !== selectedSlug);
      setItems(nextItems);
      const nextSlug =
        typeof nextItems[0]?.slug === "string" ? nextItems[0].slug : "";
      setSelectedSlug(nextSlug);
      writeSelectedSlug(nextSlug || null);
      if (nextSlug) {
        await loadCliDetail(nextSlug);
      } else {
        beginCreateCli();
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlug) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...releaseForm,
        publishedAt: new Date(releaseForm.publishedAt).toISOString(),
      };
      const endpoint = selectedReleaseVersion
        ? `/api/v1/admin/clis/${selectedSlug}/releases/${selectedReleaseVersion}`
        : `/api/v1/admin/clis/${selectedSlug}/releases`;
      const method = selectedReleaseVersion ? "PATCH" : "POST";
      await request<{ release: CliRelease }>(endpoint, {
        method,
        body: JSON.stringify(payload),
      });
      setMessage(selectedReleaseVersion ? "Release updated." : "Release created.");
      await loadCliDetail(selectedSlug);
      setSelectedReleaseVersion(releaseForm.version);
    } catch (releaseError) {
      setError(releaseError instanceof Error ? releaseError.message : String(releaseError));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteRelease(version: string) {
    if (!selectedSlug || !window.confirm(`Delete release "${version}"?`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request(`/api/v1/admin/clis/${selectedSlug}/releases/${version}`, {
        method: "DELETE",
      });
      setMessage("Release deleted.");
      await loadCliDetail(selectedSlug);
      setSelectedReleaseVersion("");
      setReleaseForm(emptyReleaseForm());
    } catch (releaseError) {
      setError(releaseError instanceof Error ? releaseError.message : String(releaseError));
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlug || !selectedReleaseVersion || !assetFile) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("file", assetFile);
      formData.set("os", assetForm.os);
      formData.set("arch", assetForm.arch);
      formData.set("packageKind", assetForm.packageKind);
      formData.set("checksumUrl", assetForm.checksumUrl);
      await request<AdminAssetUploadResult>(
        `/api/v1/admin/clis/${selectedSlug}/releases/${selectedReleaseVersion}/assets`,
        {
          method: "POST",
          body: formData,
        },
      );
      setMessage("Asset uploaded.");
      setAssetForm(emptyAssetForm());
      setAssetFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await loadCliDetail(selectedSlug);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAsset(asset: CliReleaseAsset) {
    if (!selectedSlug || !selectedReleaseVersion || !asset.id) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request(
        `/api/v1/admin/clis/${selectedSlug}/releases/${selectedReleaseVersion}/assets/${asset.id}`,
        { method: "DELETE" },
      );
      setMessage("Asset deleted.");
      await loadCliDetail(selectedSlug);
    } catch (assetError) {
      setError(assetError instanceof Error ? assetError.message : String(assetError));
    } finally {
      setBusy(false);
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (loginMode === "login") {
        await loginLocal(authForm.username, authForm.password);
        setMessage("Signed in.");
      } else {
        await registerLocal(authForm.username, authForm.password, authForm.displayName);
        setMessage("Account created.");
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : String(authError));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await logout();
      setMessage("Signed out.");
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : String(logoutError));
    } finally {
      setBusy(false);
    }
  }

  if (!authChecked) {
    return (
      <div className="admin-shell">
        <div className="admin-loading-card">Loading admin workspace...</div>
      </div>
    );
  }

  if (isAnonymous) {
    return (
      <div className="admin-shell">
        <section className="admin-auth-card">
          <p className="admin-eyebrow">CLI GREP ADMIN</p>
          <h1>Sign in to manage your CLI catalog</h1>
          <p className="admin-subcopy">
            Use Google for the fastest access, or sign in with a local account to
            continue editing your commands, versions, and release artifacts.
          </p>

          <div className="admin-auth-actions">
            <button type="button" className="admin-primary-button" onClick={() => login()}>
              Continue with Google
            </button>
            <button
              type="button"
              className="admin-ghost-button"
              onClick={() => setLoginMode(loginMode === "login" ? "register" : "login")}
            >
              {loginMode === "login" ? "Need an account?" : "Have an account already?"}
            </button>
          </div>

          <form className="admin-auth-form" onSubmit={handleAuthSubmit}>
            <label>
              Username
              <input
                value={authForm.username}
                onChange={(event) =>
                  setAuthForm((current) => ({ ...current, username: event.target.value }))
                }
                placeholder="linlay"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="At least 8 characters"
              />
            </label>
            {loginMode === "register" ? (
              <label>
                Display name
                <input
                  value={authForm.displayName}
                  onChange={(event) =>
                    setAuthForm((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  placeholder="Linlay"
                />
              </label>
            ) : null}
            <button type="submit" className="admin-primary-button" disabled={busy}>
              {loginMode === "login" ? "Sign in locally" : "Create account"}
            </button>
          </form>

          {error ? <p className="admin-error-banner">{error}</p> : null}
          {message ? <p className="admin-success-banner">{message}</p> : null}
        </section>
      </div>
    );
  }

  if (!adminMe && !error) {
    return (
      <div className="admin-shell">
        <div className="admin-loading-card">Loading admin workspace...</div>
      </div>
    );
  }

  if (!adminMe && error) {
    return (
      <div className="admin-shell">
        <section className="admin-auth-card">
          <p className="admin-eyebrow">CLI GREP ADMIN</p>
          <h1>We could not load the admin workspace.</h1>
          <p className="admin-subcopy">{error}</p>
          <div className="admin-auth-actions">
            <button type="button" className="admin-primary-button" onClick={() => window.location.reload()}>
              Retry
            </button>
            <button type="button" className="admin-ghost-button" onClick={() => window.location.assign("/")}>
              Back to site
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (adminMe && !adminMe.canAccessAdmin) {
    return (
      <div className="admin-shell">
        <section className="admin-auth-card">
          <p className="admin-eyebrow">CLI GREP ADMIN</p>
          <h1>Account signed in, but admin access is not available.</h1>
          <p className="admin-subcopy">
            This account does not currently have a usable admin role. If you expected access,
            please ask a platform administrator to confirm your role assignment.
          </p>
          <button type="button" className="admin-primary-button" onClick={() => void handleLogout()}>
            Sign out
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <div className="admin-backdrop admin-backdrop-top" />
      <div className="admin-backdrop admin-backdrop-bottom" />

      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">CLI GREP ADMIN</p>
          <h1>Release workshop for commands, versions, and artifacts.</h1>
        </div>
        <div className="admin-header-actions">
          <div className="admin-user-pill">
            <strong>{activeUser.displayName || activeUser.username}</strong>
            <span>{Array.isArray(activeUser.roles) ? activeUser.roles.join(" / ") : "member"}</span>
          </div>
          <button type="button" className="admin-ghost-button" onClick={() => window.location.assign("/")}>
            Open site
          </button>
          <button type="button" className="admin-primary-button" onClick={() => void handleLogout()}>
            Sign out
          </button>
        </div>
      </header>

      {error ? <p className="admin-error-banner">{error}</p> : null}
      {message ? <p className="admin-success-banner">{message}</p> : null}

      <main className="admin-grid">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-top">
            <div>
              <p className="admin-panel-label">Catalog</p>
              <h2>Managed CLI</h2>
            </div>
            <button type="button" className="admin-primary-button" onClick={beginCreateCli}>
              New CLI
            </button>
          </div>

          <div className="admin-sidebar-list">
            {items.map((item) => {
              const slug = typeof item.slug === "string" ? item.slug : "";
              return (
                <button
                  key={slug}
                  type="button"
                  className={`admin-cli-card ${slug === selectedSlug && !editingNewCli ? "is-active" : ""}`}
                  onClick={() => handleSelectCli(slug)}
                >
                  <span className={`admin-status-dot is-${statusTone(item.status)}`} />
                  <div>
                    <strong>{item.displayName || slug}</strong>
                    <p>{item.summary || "No summary yet."}</p>
                    <div className="admin-cli-meta">
                      <span>{slug}</span>
                      <span>{displayCountLabel(item.runCount)} runs</span>
                      <span>{displayCountLabel(item.favoriteCount)} favorites</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {!items.length ? (
              <div className="admin-empty-state">
                <p>No managed CLI yet.</p>
                <span>Create the first one to start a private draft pipeline.</span>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="admin-workspace">
          <div className="admin-hero-panel">
            <div>
              <p className="admin-panel-label">Editor</p>
              <h2>{editingNewCli ? "Create a new CLI record" : cliForm.displayName || selectedSlug || "Select a CLI"}</h2>
            </div>
            {!editingNewCli && detail?.cli ? (
              <div className="admin-hero-actions">
                <span className={`admin-status-pill is-${statusTone(detail.cli.status)}`}>
                  {(detail.cli.status as string) || "draft"}
                </span>
                <button
                  type="button"
                  className="admin-ghost-button"
                  onClick={() =>
                    void handleTogglePublish(detail.cli.status === "published" ? "unpublish" : "publish")
                  }
                >
                  {detail.cli.status === "published" ? "Move to draft" : "Publish now"}
                </button>
                <button type="button" className="admin-danger-button" onClick={() => void handleDeleteCli()}>
                  Delete CLI
                </button>
              </div>
            ) : null}
          </div>

          <div className="admin-summary-strip">
            <div>
              <span>Owned by</span>
              <strong>
                {detail?.cli.ownerUserId ? `User #${detail.cli.ownerUserId}` : "Platform catalog"}
              </strong>
            </div>
            <div>
              <span>Updated</span>
              <strong>
                {detail?.cli.updatedAt
                  ? formatCliDateTime(detail.cli.updatedAt, locale) ?? detail.cli.updatedAt
                  : "Not saved yet"}
              </strong>
            </div>
            <div>
              <span>Template</span>
              <strong>{cliForm.executionTemplate || "download-only"}</strong>
            </div>
            <div>
              <span>Releases</span>
                <strong>{releaseList.length}</strong>
            </div>
          </div>

          <form className="admin-form-grid" onSubmit={handleSaveCli}>
            <section className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <p className="admin-panel-label">CLI basics</p>
                  <h3>Metadata and execution posture</h3>
                </div>
              </div>

              <div className="admin-field-grid">
                <label>
                  Slug
                  <input
                    value={cliForm.slug}
                    disabled={!editingNewCli}
                    onChange={(event) =>
                      setCliForm((current) => ({ ...current, slug: event.target.value }))
                    }
                    placeholder="my-cli"
                  />
                </label>
                <label>
                  Display name
                  <input
                    value={cliForm.displayName}
                    onChange={(event) =>
                      setCliForm((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                    placeholder="My CLI"
                  />
                </label>
                <label>
                  Execution template
                  <select
                    value={cliForm.executionTemplate}
                    onChange={(event) =>
                      setCliForm((current) => ({
                        ...current,
                        executionTemplate: event.target.value,
                      }))
                    }
                  >
                    {executionTemplates.map((template: ExecutionTemplate) => (
                      <option key={template.id} value={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Version text
                  <input
                    value={cliForm.versionText}
                    onChange={(event) =>
                      setCliForm((current) => ({
                        ...current,
                        versionText: event.target.value,
                      }))
                    }
                    placeholder="v1.0.0"
                  />
                </label>
                <label className="admin-field-span-2">
                  Summary
                  <textarea
                    rows={3}
                    value={cliForm.summary}
                    onChange={(event) =>
                      setCliForm((current) => ({ ...current, summary: event.target.value }))
                    }
                    placeholder="One-sentence positioning for the public catalog."
                  />
                </label>
                <label className="admin-field-span-2">
                  Help text
                  <textarea
                    rows={6}
                    value={cliForm.helpText}
                    onChange={(event) =>
                      setCliForm((current) => ({ ...current, helpText: event.target.value }))
                    }
                    placeholder="Document the command flags, setup notes, and installation hints."
                  />
                </label>
                <label className="admin-field-span-2">
                  Tags
                  <input
                    value={cliForm.tags}
                    onChange={(event) =>
                      setCliForm((current) => ({ ...current, tags: event.target.value }))
                    }
                    placeholder="search, productivity, deployment"
                  />
                </label>
                <label>
                  Example line
                  <input
                    value={cliForm.exampleLine}
                    onChange={(event) =>
                      setCliForm((current) => ({
                        ...current,
                        exampleLine: event.target.value,
                      }))
                    }
                    placeholder="my-cli --help"
                  />
                </label>
                <label>
                  Original command
                  <input
                    value={cliForm.originalCommand}
                    onChange={(event) =>
                      setCliForm((current) => ({
                        ...current,
                        originalCommand: event.target.value,
                      }))
                    }
                    placeholder="my-cli"
                  />
                </label>
                <label>
                  Author
                  <input
                    value={cliForm.author}
                    onChange={(event) =>
                      setCliForm((current) => ({ ...current, author: event.target.value }))
                    }
                    placeholder="Linlay"
                  />
                </label>
                <label>
                  License
                  <input
                    value={cliForm.license}
                    onChange={(event) =>
                      setCliForm((current) => ({ ...current, license: event.target.value }))
                    }
                    placeholder="MIT"
                  />
                </label>
                <label>
                  GitHub URL
                  <input
                    value={cliForm.githubUrl}
                    onChange={(event) =>
                      setCliForm((current) => ({
                        ...current,
                        githubUrl: event.target.value,
                      }))
                    }
                    placeholder="https://github.com/example/project"
                  />
                </label>
                <label>
                  Gitee URL
                  <input
                    value={cliForm.giteeUrl}
                    onChange={(event) =>
                      setCliForm((current) => ({
                        ...current,
                        giteeUrl: event.target.value,
                      }))
                    }
                    placeholder="https://gitee.com/example/project"
                  />
                </label>
              </div>

              <div className="admin-form-actions">
                <button type="submit" className="admin-primary-button" disabled={busy}>
                  {editingNewCli ? "Create CLI draft" : "Save changes"}
                </button>
                {!editingNewCli && selectedSlug ? (
                  <button
                    type="button"
                    className="admin-ghost-button"
                    onClick={() => void loadCliDetail(selectedSlug)}
                  >
                    Reload from server
                  </button>
                ) : null}
              </div>
            </section>
          </form>

          {!editingNewCli && selectedSlug ? (
            <div className="admin-release-grid">
              <section className="admin-panel">
                <div className="admin-panel-header">
                  <div>
                    <p className="admin-panel-label">Releases</p>
                    <h3>Version timeline</h3>
                  </div>
                  <button
                    type="button"
                    className="admin-ghost-button"
                    onClick={() => {
                      setSelectedReleaseVersion("");
                      setReleaseForm(emptyReleaseForm());
                    }}
                  >
                    New release
                  </button>
                </div>

                <div className="admin-release-list">
                  {releaseList.map((release) => (
                    <button
                      key={release.version}
                      type="button"
                      className={`admin-release-card ${release.version === selectedReleaseVersion ? "is-active" : ""}`}
                      onClick={() => {
                        setSelectedReleaseVersion(typeof release.version === "string" ? release.version : "");
                        setReleaseForm(toReleaseForm(release));
                      }}
                    >
                      <div>
                        <strong>{release.version}</strong>
                        <p>
                          {release.publishedAt
                            ? formatCliDateTime(release.publishedAt, locale) ?? release.publishedAt
                            : "No publish timestamp"}
                        </p>
                      </div>
                      {release.isCurrent ? <span className="admin-current-pill">current</span> : null}
                    </button>
                  ))}
                  {!releaseList.length ? (
                    <div className="admin-empty-state">
                      <p>No releases yet.</p>
                      <span>Create a version before uploading packages.</span>
                    </div>
                  ) : null}
                </div>

                <form className="admin-inline-form" onSubmit={handleSaveRelease}>
                  <label>
                    Version
                    <input
                      value={releaseForm.version}
                      disabled={Boolean(selectedReleaseVersion)}
                      onChange={(event) =>
                        setReleaseForm((current) => ({ ...current, version: event.target.value }))
                      }
                      placeholder="v1.0.0"
                    />
                  </label>
                  <label>
                    Published at
                    <input
                      type="datetime-local"
                      value={releaseForm.publishedAt}
                      onChange={(event) =>
                        setReleaseForm((current) => ({
                          ...current,
                          publishedAt: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Source kind
                    <input
                      value={releaseForm.sourceKind}
                      onChange={(event) =>
                        setReleaseForm((current) => ({
                          ...current,
                          sourceKind: event.target.value,
                        }))
                      }
                      placeholder="manual"
                    />
                  </label>
                  <label className="admin-field-span-2">
                    Source URL
                    <input
                      value={releaseForm.sourceUrl}
                      onChange={(event) =>
                        setReleaseForm((current) => ({
                          ...current,
                          sourceUrl: event.target.value,
                        }))
                      }
                      placeholder="https://example.com/releases/v1.0.0"
                    />
                  </label>
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={releaseForm.isCurrent}
                      onChange={(event) =>
                        setReleaseForm((current) => ({
                          ...current,
                          isCurrent: event.target.checked,
                        }))
                      }
                    />
                    Mark as current release
                  </label>
                  <div className="admin-form-actions">
                    <button type="submit" className="admin-primary-button" disabled={busy}>
                      {selectedReleaseVersion ? "Update release" : "Create release"}
                    </button>
                    {selectedReleaseVersion ? (
                      <button
                        type="button"
                        className="admin-danger-button"
                        onClick={() => void handleDeleteRelease(selectedReleaseVersion)}
                      >
                        Delete release
                      </button>
                    ) : null}
                  </div>
                </form>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-header">
                  <div>
                    <p className="admin-panel-label">Artifacts</p>
                    <h3>Upload and prune release packages</h3>
                  </div>
                </div>

                {selectedRelease ? (
                  <>
                    <form className="admin-inline-form" onSubmit={handleUploadAsset}>
                      <label className="admin-field-span-2">
                        Package file
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={(event) => setAssetFile(event.target.files?.[0] ?? null)}
                        />
                      </label>
                      <label>
                        OS
                        <input
                          value={assetForm.os}
                          onChange={(event) =>
                            setAssetForm((current) => ({ ...current, os: event.target.value }))
                          }
                          placeholder="darwin"
                        />
                      </label>
                      <label>
                        Arch
                        <input
                          value={assetForm.arch}
                          onChange={(event) =>
                            setAssetForm((current) => ({ ...current, arch: event.target.value }))
                          }
                          placeholder="arm64"
                        />
                      </label>
                      <label>
                        Package kind
                        <input
                          value={assetForm.packageKind}
                          onChange={(event) =>
                            setAssetForm((current) => ({
                              ...current,
                              packageKind: event.target.value,
                            }))
                          }
                          placeholder="tar.gz"
                        />
                      </label>
                      <label className="admin-field-span-2">
                        Checksum URL
                        <input
                          value={assetForm.checksumUrl}
                          onChange={(event) =>
                            setAssetForm((current) => ({
                              ...current,
                              checksumUrl: event.target.value,
                            }))
                          }
                          placeholder="https://example.com/checksums.txt"
                        />
                      </label>
                      <div className="admin-form-actions">
                        <button type="submit" className="admin-primary-button" disabled={busy || !assetFile}>
                          Upload asset
                        </button>
                      </div>
                    </form>

                    <div className="admin-asset-list">
                      {asAssetList(selectedRelease.assets).map((asset) => (
                        <article key={String(asset.id ?? asset.fileName)} className="admin-asset-card">
                          <div>
                            <strong>{asset.fileName || "Unnamed asset"}</strong>
                            <p>
                              {[asset.os, asset.arch, asset.packageKind].filter(Boolean).join(" / ") || "No package metadata"}
                            </p>
                            <span>{formatBytes(asset.sizeBytes)}</span>
                          </div>
                          <div className="admin-asset-actions">
                            {asset.downloadUrl ? (
                              <a href={asset.downloadUrl} target="_blank" rel="noreferrer" className="admin-ghost-link">
                                Open
                              </a>
                            ) : null}
                            <button type="button" className="admin-danger-button" onClick={() => void handleDeleteAsset(asset)}>
                              Delete
                            </button>
                          </div>
                        </article>
                      ))}
                      {!asAssetList(selectedRelease.assets).length ? (
                        <div className="admin-empty-state">
                          <p>No assets on this release yet.</p>
                          <span>Upload installers, tarballs, or platform-specific bundles here.</span>
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="admin-empty-state">
                    <p>Select or create a release first.</p>
                    <span>Artifact uploads attach to a specific immutable version.</span>
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
