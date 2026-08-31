import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  Compass,
  Cpu,
  FlaskConical,
  LifeBuoy,
  ListChecks,
  Paperclip,
  PencilLine,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { Link, matchPath, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { UserRole } from "@sem/platform-shared";
import { EDWARDS_ICON_SRC, EDWARDS_LOGO_SRC } from "@sem/platform-frontend";
import { PlatformAppShell } from "@sem/platform-frontend/app";
import { useAuth } from "@sem/platform-frontend/features/auth";
import {
  InfoCard,
  PageBody,
  PageHeader,
  PageHeaderBadge,
  PageSection,
  SectionBadge,
} from "@sem/platform-frontend/components";
import { activeNavLabelFromPath, type NavTreeItem } from "@sem/platform-frontend/features/navigation";
import type { MainLayoutBranding, MainLayoutHeaderBreadcrumbResolverArgs } from "@sem/platform-frontend/layouts";
import type {
  ControllerSoftwareRequestPayload,
  CreateMasterDataOptionInput,
  MasterDataGroupValue,
  MasterDataOption,
  PumpTestRigRequestPayload,
  TicketRequestMasterData,
  UpdateMasterDataOptionInput,
} from "@ticket-system/shared";
import { MASTER_DATA_GROUPS } from "@ticket-system/shared";
import {
  createMasterDataOption,
  deleteMasterDataOption,
  fetchMasterDataOptionsByGroup,
  fetchTicketRequestMasterData,
  submitControllerSoftwareRequest,
  submitPumpTestRigRequest,
  toggleMasterDataOptionActive,
  updateMasterDataOption,
} from "./services/ticketRequestApi";

const ROUTE_PATHS = {
  overview: "/overview",
  dashboard: "/overview/dashboard",
  legacyDashboard: "/overview/ticket-system",
  helpCenter: "/help-center",
  ticketRequest: "/ticket-request",
  pumpTestRigRequest: "/ticket-request/pump-test-rig-request",
  controllerSoftwareRequest: "/ticket-request/controller-software-request",
  ticketRequestSetting: "/ticket-request-setting",
  pumpTestRigSetting: "/ticket-request-setting/pump-test-rig",
  controllerSoftwareSetting: "/ticket-request-setting/controller-software",
} as const;

const navTree: NavTreeItem[] = [
  {
    id: "overview",
    to: ROUTE_PATHS.overview,
    label: "Overview",
    icon: <Compass size={16} />,
    children: [
      {
        id: "dashboard",
        label: "Dashboard",
        to: ROUTE_PATHS.dashboard,
        icon: <BarChart3 size={16} />,
        roles: [UserRole.User],
      },
    ],
  },
  {
    id: "help-center",
    to: ROUTE_PATHS.helpCenter,
    label: "Help Center",
    icon: <LifeBuoy size={16} />,
  },
  {
    id: "ticket-request",
    to: ROUTE_PATHS.ticketRequest,
    label: "Ticket Request",
    icon: <ClipboardList size={16} />,
    children: [
      {
        id: "pump-test-rig-request",
        label: "Pump Test Rig Request",
        to: ROUTE_PATHS.pumpTestRigRequest,
        icon: <FlaskConical size={16} />,
        roles: [UserRole.User],
      },
      {
        id: "controller-software-request",
        label: "Controller Software Request",
        to: ROUTE_PATHS.controllerSoftwareRequest,
        icon: <Cpu size={16} />,
        roles: [UserRole.User],
      },
    ],
  },
  {
    id: "ticket-request-setting",
    to: ROUTE_PATHS.ticketRequestSetting,
    label: "Ticket Request Setting",
    icon: <Settings size={16} />,
    children: [
      {
        id: "pump-test-rig-setting",
        label: "Pump Test Rig Request",
        to: ROUTE_PATHS.pumpTestRigSetting,
        icon: <FlaskConical size={16} />,
      },
      {
        id: "controller-software-setting",
        label: "Controller Software Request",
        to: ROUTE_PATHS.controllerSoftwareSetting,
        icon: <Cpu size={16} />,
      },
    ],
  },
];

const HELP_CENTER_PORTAL_NAME = "PCCA SEM S/W";

const destinationDescriptions: Record<string, string> = {
  dashboard: "Starter metrics and replacement points for a derived SEM SW application.",
  "pump-test-rig-request": "Submit and track Pump Test Rig issues with standard templates and attachments.",
  "controller-software-request": "Submit controller software issues including version details and reproducible evidence.",
};

const branding: MainLayoutBranding = {
  productName: "SEM SW Ticket System",
  productTag: "Internal Request Portal",
  logoSrc: EDWARDS_LOGO_SRC,
  logoAlt: "Edwards",
  iconSrc: EDWARDS_ICON_SRC,
  iconAlt: "Edwards E",
  homePath: ROUTE_PATHS.ticketRequest,
  headerHomePath: ROUTE_PATHS.ticketRequest,
  rootBreadcrumbLabel: "Ticket Request",
  storageKeyPrefix: "ticket-system",
  screenshotFilePrefix: "ticket-system",
};

function getHeaderNavBreadcrumbs({ pathname, navTrail, moreTrail }: MainLayoutHeaderBreadcrumbResolverArgs) {
  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  if (
    matchPath({ path: ROUTE_PATHS.dashboard, end: true }, normalizedPathname)
    || matchPath({ path: ROUTE_PATHS.legacyDashboard, end: true }, normalizedPathname)
  ) {
    return [
      { label: "Overview", to: ROUTE_PATHS.overview },
      { label: "Dashboard", to: ROUTE_PATHS.dashboard },
    ];
  }

  if (matchPath({ path: ROUTE_PATHS.overview, end: true }, normalizedPathname)) {
    return [{ label: "Overview", to: ROUTE_PATHS.overview }];
  }

  if (matchPath({ path: ROUTE_PATHS.helpCenter, end: true }, normalizedPathname)) {
    return [
      { label: "Help Center", to: ROUTE_PATHS.helpCenter },
      { label: HELP_CENTER_PORTAL_NAME },
    ];
  }

  if (matchPath({ path: ROUTE_PATHS.ticketRequest, end: true }, normalizedPathname)) {
    return [{ label: "Ticket Request", to: ROUTE_PATHS.ticketRequest }];
  }

  if (matchPath({ path: ROUTE_PATHS.pumpTestRigRequest, end: true }, normalizedPathname)) {
    return [
      { label: "Ticket Request", to: ROUTE_PATHS.ticketRequest },
      { label: "Pump Test Rig Request", to: ROUTE_PATHS.pumpTestRigRequest },
    ];
  }

  if (matchPath({ path: ROUTE_PATHS.controllerSoftwareRequest, end: true }, normalizedPathname)) {
    return [
      { label: "Ticket Request", to: ROUTE_PATHS.ticketRequest },
      { label: "Controller Software Request", to: ROUTE_PATHS.controllerSoftwareRequest },
    ];
  }

  if (matchPath({ path: ROUTE_PATHS.ticketRequestSetting, end: true }, normalizedPathname)) {
    return [{ label: "Ticket Request Setting", to: ROUTE_PATHS.ticketRequestSetting }];
  }

  if (matchPath({ path: ROUTE_PATHS.pumpTestRigSetting, end: true }, normalizedPathname)) {
    return [
      { label: "Ticket Request Setting", to: ROUTE_PATHS.ticketRequestSetting },
      { label: "Pump Test Rig Request", to: ROUTE_PATHS.pumpTestRigSetting },
    ];
  }

  if (matchPath({ path: ROUTE_PATHS.controllerSoftwareSetting, end: true }, normalizedPathname)) {
    return [
      { label: "Ticket Request Setting", to: ROUTE_PATHS.ticketRequestSetting },
      { label: "Controller Software Request", to: ROUTE_PATHS.controllerSoftwareSetting },
    ];
  }

  if (navTrail.length > 0) return navTrail;
  if (moreTrail.length > 0) return moreTrail;

  return [
    { label: "Overview", to: ROUTE_PATHS.overview },
    { label: activeNavLabelFromPath(pathname) },
  ];
}

function OverviewPage() {
  const sections = navTree.filter((item) => item.id === "overview" || item.id === "ticket-request");

  return (
    <PageBody>
      <PageHeader
        icon={<ListChecks size={18} />}
        title="Workspace Overview"
        badges={
          <>
            <PageHeaderBadge>{sections.length} menus</PageHeaderBadge>
            <PageHeaderBadge>Enterprise Request Flow</PageHeaderBadge>
          </>
        }
      />

      <div className="space-y-6">
        {sections.map((section) => {
          const cards = section.children ?? [];

          return (
            <PageSection
              key={section.id}
              title={section.label}
              icon={section.icon}
              badges={<SectionBadge tone={section.id === "ticket-request" ? "brand" : undefined}>{cards.length} pages</SectionBadge>}
            >
              <section className="grid gap-5 lg:grid-cols-2">
                {cards.map((card) => (
                  <Link
                    key={card.id}
                    to={card.to}
                    className={clsx(
                      "section-card rounded-[1.2rem] p-6 transition duration-200",
                      "hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-ring",
                    )}
                  >
                    <div className="section-card__header border-b-0 !bg-transparent !p-0">
                      <div className="section-card__copy">
                        <div className="section-card__title-row">
                          <div className="min-w-0">
                            <div className="section-card__eyebrow">{section.label}</div>
                            <h2 className="section-card__title text-xl">{card.label}</h2>
                          </div>
                        </div>
                      </div>
                      <div className="section-card__aside">
                        <SectionBadge tone="brand">Go</SectionBadge>
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      <p className="panel-text-muted text-sm leading-6">{destinationDescriptions[card.id] ?? "Open this section."}</p>
                    </div>
                  </Link>
                ))}
              </section>
            </PageSection>
          );
        })}
      </div>
    </PageBody>
  );
}

function DashboardPage() {
  return (
    <PageBody>
      <PageHeader
        icon={<BarChart3 size={18} />}
        title="Dashboard"
        badges={
          <>
            <PageHeaderBadge>Web Template</PageHeaderBadge>
            <PageHeaderBadge>Starter Baseline</PageHeaderBadge>
          </>
        }
      />
      <PageSection
        title="Dashboard"
        icon={<BarChart3 size={16} />}
        badges={<SectionBadge>Template Ready</SectionBadge>}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <InfoCard label="Starter status" value="READY" labelVariant="title" />
          <InfoCard label="Master-data API" value="DB READY" labelVariant="title" />
          <InfoCard label="Jira integration layer" value="ABSTRACTED" labelVariant="title" />
        </div>
      </PageSection>
    </PageBody>
  );
}

type RichTextEditorProps = {
  label: string;
  value: string;
  onChange: (html: string) => void;
  required?: boolean;
  error?: string;
};

function RichTextEditor({ label, value, onChange, required = false, error }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const runCommand = (command: string) => {
    document.execCommand(command);
    onChange(editorRef.current?.innerHTML ?? "");
  };

  return (
    <div className="request-field">
      <label className="request-label">
        {label}
        {required && <span className="request-required"> *</span>}
      </label>
      <div className="editor-shell">
        <div className="editor-toolbar">
          <button type="button" className="editor-tool-btn" onClick={() => runCommand("bold")}>B</button>
          <button type="button" className="editor-tool-btn" onClick={() => runCommand("italic")}>I</button>
          <button type="button" className="editor-tool-btn" onClick={() => runCommand("insertUnorderedList")}>List</button>
        </div>
        <div
          ref={editorRef}
          className="editor-content"
          contentEditable
          role="textbox"
          aria-label={label}
          onInput={(event) => onChange((event.currentTarget as HTMLDivElement).innerHTML)}
          suppressContentEditableWarning
        />
      </div>
      {error && <p className="request-error">{error}</p>}
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isSameFile(left: File, right: File) {
  return left.name === right.name && left.size === right.size && left.lastModified === right.lastModified;
}

type AttachmentDropzoneProps = {
  files: File[];
  onChange: (files: File[]) => void;
};

function AttachmentDropzone({ files, onChange }: AttachmentDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const appendFiles = (incoming: FileList | null) => {
    const added = Array.from(incoming ?? []);
    if (added.length === 0) return;

    const merged = [...files];
    for (const file of added) {
      if (!merged.some((existing) => isSameFile(existing, file))) merged.push(file);
    }
    onChange(merged);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    appendFiles(event.dataTransfer.files);
  };

  return (
    <div className="request-field request-field--wide">
      <span className="request-label" id="attachment-dropzone-label">Attachment</span>
      <div
        className={clsx("attachment-dropzone", isDragging && "attachment-dropzone--active")}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <Paperclip size={16} aria-hidden="true" />
        <span>
          Drop files to attach or{" "}
          <button type="button" className="attachment-browse" onClick={() => inputRef.current?.click()}>
            browse
          </button>
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          aria-labelledby="attachment-dropzone-label"
          onChange={(event) => {
            appendFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {files.length > 0 && (
        <ul className="attachment-list">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`} className="attachment-item">
              <span className="attachment-item__name">{file.name}</span>
              <span className="attachment-item__size">{formatFileSize(file.size)}</span>
              <button
                type="button"
                className="attachment-item__remove"
                aria-label={`Remove ${file.name}`}
                onClick={() => onChange(files.filter((existing) => !isSameFile(existing, file)))}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function optionItems(options: MasterDataOption[]) {
  return options
    .filter((option) => option.isActive)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((option) => (
      <option key={option.id} value={option.id}>{option.name}</option>
    ));
}

function sanitizeRichText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DEFAULT_PUMP_TEMPLATE = [
  "Attachment",
  "- FTCR Template",
  "",
  "Attachment",
  "- Test SW Requirement Template",
  "",
  "Comment Added",
  "- If regarding activation code, please provide Request Code and Email Address",
  "",
  "Comment Added",
  "- Pump P/N",
  "- Pre-condition",
  "- Test Rig Name (Location)",
  "- Problem / Issue",
].join("<br />");

function MasterDataStatus({ query }: { query: { isPending: boolean; isError: boolean; error: Error | null } }) {
  if (query.isPending) {
    return <p className="panel-text-muted text-sm">Loading master data from seeded database tables...</p>;
  }
  if (query.isError) {
    return <p className="request-error">Master data load failed: {query.error?.message ?? "unknown error"}</p>;
  }
  return null;
}

type RequestFormProps = {
  onCancel: () => void;
};

type PumpFormState = {
  requester: string;
  title: string;
  priorityId: string;
  productId: string;
  requestSourceId: string;
  dateFound: string;
  rigTypeId: string;
  categoryId: string;
  issueTypeId: string;
  issuedSiteId: string;
  additionalCategoryId: string;
  descriptionHtml: string;
  stepsToReproduceHtml: string;
};

function PumpTestRigRequestForm({ onCancel }: RequestFormProps) {
  const masterDataQuery = useQuery({
    queryKey: ["ticket-request-master-data"],
    queryFn: fetchTicketRequestMasterData,
    staleTime: 300_000,
  });

  const [form, setForm] = useState<PumpFormState>({
    requester: "",
    title: "",
    priorityId: "",
    productId: "",
    requestSourceId: "",
    dateFound: "",
    rigTypeId: "",
    categoryId: "",
    issueTypeId: "",
    issuedSiteId: "",
    additionalCategoryId: "",
    descriptionHtml: DEFAULT_PUMP_TEMPLATE,
    stepsToReproduceHtml: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [descriptionError, setDescriptionError] = useState("");
  const [stepsError, setStepsError] = useState("");

  const submitMutation = useMutation({
    mutationFn: submitPumpTestRigRequest,
  });

  const masterData = masterDataQuery.data;
  const { user } = useAuth();

  const defaultPriorityId = useMemo(
    () => masterData?.priorities.find((option) => option.isActive && option.name.trim().toLowerCase() === "medium")?.id ?? "",
    [masterData],
  );

  useEffect(() => {
    if (!user) return;
    setForm((current) =>
      current.requester.length > 0 ? current : { ...current, requester: `${user.englishName} (${user.email})` },
    );
  }, [user]);

  useEffect(() => {
    if (!defaultPriorityId) return;
    setForm((current) => (current.priorityId.length > 0 ? current : { ...current, priorityId: defaultPriorityId }));
  }, [defaultPriorityId]);

  const updateForm = <K extends keyof PumpFormState>(key: K, value: PumpFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const descriptionText = sanitizeRichText(form.descriptionHtml);
    const stepsText = sanitizeRichText(form.stepsToReproduceHtml);

    setDescriptionError(descriptionText.length === 0 ? "Description is required." : "");
    setStepsError(stepsText.length === 0 ? "Steps to Reproduce is required." : "");

    if (!event.currentTarget.reportValidity() || descriptionText.length === 0 || stepsText.length === 0) {
      return;
    }

    const payload: PumpTestRigRequestPayload = {
      requester: form.requester,
      title: form.title,
      priorityId: form.priorityId,
      productId: form.productId,
      requestSourceId: form.requestSourceId,
      dateFound: form.dateFound || undefined,
      rigTypeId: form.rigTypeId,
      categoryId: form.categoryId,
      issueTypeId: form.issueTypeId,
      issuedSiteId: form.issuedSiteId,
      descriptionHtml: form.descriptionHtml,
      stepsToReproduceHtml: form.stepsToReproduceHtml,
      additionalCategoryId: form.additionalCategoryId || undefined,
      attachments: files.map((file) => ({
        fileName: file.name,
        sizeBytes: file.size,
        contentType: file.type || "application/octet-stream",
      })),
    };

    await submitMutation.mutateAsync(payload);
  };

  return (
    <>
      <MasterDataStatus query={masterDataQuery} />
      {masterData && (
        <form className="request-form" onSubmit={onSubmit}>
          <p className="request-required-note">
            Required fields are marked with an asterisk <span className="request-required">*</span>
          </p>

          <h3 className="request-section-title">Request Information</h3>
          <div className="request-grid">
            <div className="request-field request-field--wide">
              <label className="request-label" htmlFor="pump-requester">
                Raise this request on behalf of <span className="request-required">*</span>
              </label>
              <div className="request-user-field">
                <UserRound size={16} className="request-user-field__icon" aria-hidden="true" />
                <input
                  id="pump-requester"
                  className="form-input request-user-field__input"
                  value={form.requester}
                  onChange={(e) => updateForm("requester", e.target.value)}
                  placeholder="Name (email)"
                  required
                />
                {form.requester.length > 0 && (
                  <button
                    type="button"
                    className="request-user-field__clear"
                    aria-label="Clear requester"
                    onClick={() => updateForm("requester", "")}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
            <label className="request-field request-field--wide">
              <span className="request-label">Title <span className="request-required">*</span></span>
              <input className="form-input" value={form.title} onChange={(e) => updateForm("title", e.target.value)} required />
            </label>
            <label className="request-field request-field--wide">
              <span className="request-label">Priority <span className="request-required">*</span></span>
              <select className="form-input" value={form.priorityId} onChange={(e) => updateForm("priorityId", e.target.value)} required>
                <option value="">Select priority</option>
                {optionItems(masterData.priorities)}
              </select>
            </label>
            <label className="request-field request-field--wide">
              <span className="request-label">Product <span className="request-required">*</span></span>
              <select className="form-input" value={form.productId} onChange={(e) => updateForm("productId", e.target.value)} required>
                <option value="">Select product</option>
                {optionItems(masterData.products)}
              </select>
            </label>
            <label className="request-field">
              <span className="request-label">Request Source <span className="request-required">*</span></span>
              <select className="form-input" value={form.requestSourceId} onChange={(e) => updateForm("requestSourceId", e.target.value)} required>
                <option value="">Select request source</option>
                {optionItems(masterData.requestSources)}
              </select>
            </label>
            <label className="request-field">
              <span className="request-label">Date Found</span>
              <input type="date" className="form-input" value={form.dateFound} onChange={(e) => updateForm("dateFound", e.target.value)} />
            </label>
            <label className="request-field">
              <span className="request-label">Rig Type <span className="request-required">*</span></span>
              <select className="form-input" value={form.rigTypeId} onChange={(e) => updateForm("rigTypeId", e.target.value)} required>
                <option value="">Select rig type</option>
                {optionItems(masterData.rigTypes)}
              </select>
            </label>
            <label className="request-field">
              <span className="request-label">Category <span className="request-required">*</span></span>
              <select className="form-input" value={form.categoryId} onChange={(e) => updateForm("categoryId", e.target.value)} required>
                <option value="">Select category</option>
                {optionItems(masterData.categories)}
              </select>
            </label>
            <label className="request-field">
              <span className="request-label">Issue Type <span className="request-required">*</span></span>
              <select className="form-input" value={form.issueTypeId} onChange={(e) => updateForm("issueTypeId", e.target.value)} required>
                <option value="">Select issue type</option>
                {optionItems(masterData.issueTypes)}
              </select>
            </label>
            <label className="request-field request-field--wide">
              <span className="request-label">Issued Site <span className="request-required">*</span></span>
              <select className="form-input" value={form.issuedSiteId} onChange={(e) => updateForm("issuedSiteId", e.target.value)} required>
                <option value="">Select issued site</option>
                {optionItems(masterData.issuedSites)}
              </select>
            </label>
          </div>

          <RichTextEditor
            label="Description"
            value={form.descriptionHtml}
            onChange={(html) => updateForm("descriptionHtml", html)}
            required
            error={descriptionError}
          />

          <RichTextEditor
            label="Steps to Reproduce"
            value={form.stepsToReproduceHtml}
            onChange={(html) => updateForm("stepsToReproduceHtml", html)}
            required
            error={stepsError}
          />

          <h3 className="request-section-title">Additional Information</h3>
          <div className="request-grid">
            <label className="request-field request-field--wide">
              <span className="request-label">Category</span>
              <select className="form-input" value={form.additionalCategoryId} onChange={(e) => updateForm("additionalCategoryId", e.target.value)}>
                <option value="">Select additional category</option>
                {optionItems(masterData.categories)}
              </select>
            </label>
            <AttachmentDropzone files={files} onChange={setFiles} />
          </div>

          <div className="request-actions">
            <button type="submit" className="btn-primary" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Sending..." : "Send"}
            </button>
            <button type="button" className="btn-secondary" disabled={submitMutation.isPending} onClick={onCancel}>
              Cancel
            </button>
          </div>

          {submitMutation.isSuccess && (
            <p className="request-success">
              Submitted: {submitMutation.data.requestId} (Jira: {submitMutation.data.jiraIssueKey ?? "pending"})
            </p>
          )}
          {submitMutation.isError && (
            <p className="request-error">Submission failed: {submitMutation.error.message}</p>
          )}
        </form>
      )}
    </>
  );
}

function PumpTestRigRequestPage() {
  const navigate = useNavigate();

  return (
    <PageBody>
      <PageHeader
        icon={<FlaskConical size={18} />}
        title="Pump Test Rig Request"
        badges={
          <>
            <PageHeaderBadge>Desktop First</PageHeaderBadge>
            <PageHeaderBadge>API Ready</PageHeaderBadge>
          </>
        }
      />

      <PageSection
        title="Request Form"
        icon={<ClipboardList size={16} />}
        badges={<SectionBadge tone="brand">Required Field Validation</SectionBadge>}
      >
        <div className="request-type-card">
          <span className="request-type-card__icon">
            <FlaskConical size={18} aria-hidden="true" />
          </span>
          <div className="request-type-card__body">
            <p className="request-type-card__eyebrow">What can we help you with?</p>
            <h3 className="request-type-card__title">Pump Test Rig Request</h3>
          </div>
          <Link to={ROUTE_PATHS.ticketRequest} className="btn-secondary request-type-card__action">
            Change request type
          </Link>
        </div>

        <PumpTestRigRequestForm onCancel={() => navigate(ROUTE_PATHS.ticketRequest)} />
      </PageSection>
    </PageBody>
  );
}

type ControllerFormState = {
  requester: string;
  title: string;
  priorityId: string;
  productId: string;
  controllerTypeId: string;
  requestSourceId: string;
  dateFound: string;
  categoryId: string;
  mainVersionId: string;
  mainVersionOther: string;
  subVersionId: string;
  subVersionOther: string;
  additionalCategoryId: string;
  descriptionHtml: string;
  stepsToReproduceHtml: string;
};

function ControllerSoftwareRequestForm({ onCancel }: RequestFormProps) {
  const masterDataQuery = useQuery({
    queryKey: ["ticket-request-master-data"],
    queryFn: fetchTicketRequestMasterData,
    staleTime: 300_000,
  });
  const [form, setForm] = useState<ControllerFormState>({
    requester: "",
    title: "",
    priorityId: "",
    productId: "",
    controllerTypeId: "",
    requestSourceId: "",
    dateFound: "",
    categoryId: "",
    mainVersionId: "",
    mainVersionOther: "",
    subVersionId: "",
    subVersionOther: "",
    additionalCategoryId: "",
    descriptionHtml: "",
    stepsToReproduceHtml: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [descriptionError, setDescriptionError] = useState("");
  const [stepsError, setStepsError] = useState("");

  const submitMutation = useMutation({
    mutationFn: submitControllerSoftwareRequest,
  });

  const masterData = masterDataQuery.data;
  const { user } = useAuth();

  const defaultPriorityId = useMemo(
    () => masterData?.priorities.find((option) => option.isActive && option.name.trim().toLowerCase() === "medium")?.id ?? "",
    [masterData],
  );

  useEffect(() => {
    if (!user) return;
    setForm((current) =>
      current.requester.length > 0 ? current : { ...current, requester: `${user.englishName} (${user.email})` },
    );
  }, [user]);

  useEffect(() => {
    if (!defaultPriorityId) return;
    setForm((current) => (current.priorityId.length > 0 ? current : { ...current, priorityId: defaultPriorityId }));
  }, [defaultPriorityId]);

  const updateForm = <K extends keyof ControllerFormState>(key: K, value: ControllerFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const descriptionText = sanitizeRichText(form.descriptionHtml);
    const stepsText = sanitizeRichText(form.stepsToReproduceHtml);

    setDescriptionError(descriptionText.length === 0 ? "Description is required." : "");
    setStepsError(stepsText.length === 0 ? "Steps to Reproduce is required." : "");

    if (!event.currentTarget.reportValidity() || descriptionText.length === 0 || stepsText.length === 0) {
      return;
    }

    const payload: ControllerSoftwareRequestPayload = {
      requester: form.requester,
      title: form.title,
      priorityId: form.priorityId,
      productId: form.productId,
      requestSourceId: form.requestSourceId,
      dateFound: form.dateFound || undefined,
      categoryId: form.categoryId,
      controllerTypeId: form.controllerTypeId,
      mainVersionId: form.mainVersionId,
      mainVersionOther: form.mainVersionId === "main-other" ? form.mainVersionOther : undefined,
      subVersionId: form.subVersionId,
      subVersionOther: form.subVersionId === "sub-other" ? form.subVersionOther : undefined,
      descriptionHtml: form.descriptionHtml,
      stepsToReproduceHtml: form.stepsToReproduceHtml,
      additionalCategoryId: form.additionalCategoryId || undefined,
      attachments: files.map((file) => ({
        fileName: file.name,
        sizeBytes: file.size,
        contentType: file.type || "application/octet-stream",
      })),
    };

    await submitMutation.mutateAsync(payload);
  };

  return (
    <>
      <MasterDataStatus query={masterDataQuery} />
      {masterData && (
        <form className="request-form" onSubmit={onSubmit}>
          <p className="request-required-note">
            Required fields are marked with an asterisk <span className="request-required">*</span>
          </p>

          <h3 className="request-section-title">Request Information</h3>
          <div className="request-grid">
            <div className="request-field request-field--wide">
              <label className="request-label" htmlFor="controller-requester">
                Raise this request on behalf of <span className="request-required">*</span>
              </label>
              <div className="request-user-field">
                <UserRound size={16} className="request-user-field__icon" aria-hidden="true" />
                <input
                  id="controller-requester"
                  className="form-input request-user-field__input"
                  value={form.requester}
                  onChange={(e) => updateForm("requester", e.target.value)}
                  placeholder="Name (email)"
                  required
                />
                {form.requester.length > 0 && (
                  <button
                    type="button"
                    className="request-user-field__clear"
                    aria-label="Clear requester"
                    onClick={() => updateForm("requester", "")}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
            <label className="request-field request-field--wide">
              <span className="request-label">Title <span className="request-required">*</span></span>
              <input className="form-input" value={form.title} onChange={(e) => updateForm("title", e.target.value)} required />
            </label>
            <label className="request-field request-field--wide">
              <span className="request-label">Priority <span className="request-required">*</span></span>
              <select className="form-input" value={form.priorityId} onChange={(e) => updateForm("priorityId", e.target.value)} required>
                <option value="">Select priority</option>
                {optionItems(masterData.priorities)}
              </select>
            </label>
            <label className="request-field request-field--wide">
              <span className="request-label">Product <span className="request-required">*</span></span>
              <select className="form-input" value={form.productId} onChange={(e) => updateForm("productId", e.target.value)} required>
                <option value="">Select product</option>
                {optionItems(masterData.products)}
              </select>
            </label>
            <label className="request-field request-field--wide">
              <span className="request-label">Controller Type <span className="request-required">*</span></span>
              <select className="form-input" value={form.controllerTypeId} onChange={(e) => updateForm("controllerTypeId", e.target.value)} required>
                <option value="">Select controller type</option>
                {optionItems(masterData.controllerTypes)}
              </select>
            </label>
            <label className="request-field">
              <span className="request-label">Request Source <span className="request-required">*</span></span>
              <select className="form-input" value={form.requestSourceId} onChange={(e) => updateForm("requestSourceId", e.target.value)} required>
                <option value="">Select request source</option>
                {optionItems(masterData.requestSources)}
              </select>
            </label>
            <label className="request-field">
              <span className="request-label">Date Found</span>
              <input type="date" className="form-input" value={form.dateFound} onChange={(e) => updateForm("dateFound", e.target.value)} />
            </label>
            <label className="request-field request-field--wide">
              <span className="request-label">Category <span className="request-required">*</span></span>
              <select className="form-input" value={form.categoryId} onChange={(e) => updateForm("categoryId", e.target.value)} required>
                <option value="">Select category</option>
                {optionItems(masterData.categories)}
              </select>
            </label>
          </div>

          <h3 className="request-section-title">Software Version Information</h3>
          <div className="request-grid">
            <label className="request-field">
              <span className="request-label">Main Version (D37XXXXXX) <span className="request-required">*</span></span>
              <select className="form-input" value={form.mainVersionId} onChange={(e) => updateForm("mainVersionId", e.target.value)} required>
                <option value="">Select main version</option>
                {optionItems(masterData.softwareMainVersions)}
              </select>
            </label>
            <label className="request-field">
              <span className="request-label">Sub Version (A~Z) <span className="request-required">*</span></span>
              <span className="request-hint">If selected other in the Main version, select other.</span>
              <select className="form-input" value={form.subVersionId} onChange={(e) => updateForm("subVersionId", e.target.value)} required>
                <option value="">Select sub version</option>
                {optionItems(masterData.softwareSubVersions)}
              </select>
            </label>
            {form.mainVersionId === "main-other" && (
              <label className="request-field">
                <span className="request-label">Main Version (Other) <span className="request-required">*</span></span>
                <input className="form-input" value={form.mainVersionOther} onChange={(e) => updateForm("mainVersionOther", e.target.value)} required />
              </label>
            )}
            {form.subVersionId === "sub-other" && (
              <label className="request-field">
                <span className="request-label">Sub Version (Other) <span className="request-required">*</span></span>
                <input className="form-input" value={form.subVersionOther} onChange={(e) => updateForm("subVersionOther", e.target.value)} required />
              </label>
            )}
          </div>

          <RichTextEditor
            label="Description"
            value={form.descriptionHtml}
            onChange={(html) => updateForm("descriptionHtml", html)}
            required
            error={descriptionError}
          />

          <RichTextEditor
            label="Steps to Reproduce"
            value={form.stepsToReproduceHtml}
            onChange={(html) => updateForm("stepsToReproduceHtml", html)}
            required
            error={stepsError}
          />

          <h3 className="request-section-title">Additional Information</h3>
          <div className="request-grid">
            <label className="request-field request-field--wide">
              <span className="request-label">Category</span>
              <select className="form-input" value={form.additionalCategoryId} onChange={(e) => updateForm("additionalCategoryId", e.target.value)}>
                <option value="">Select additional category</option>
                {optionItems(masterData.categories)}
              </select>
            </label>
            <AttachmentDropzone files={files} onChange={setFiles} />
          </div>

          <div className="request-actions">
            <button type="submit" className="btn-primary" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Sending..." : "Send"}
            </button>
            <button type="button" className="btn-secondary" disabled={submitMutation.isPending} onClick={onCancel}>
              Cancel
            </button>
          </div>

          {submitMutation.isSuccess && (
            <p className="request-success">
              Submitted: {submitMutation.data.requestId} (Jira: {submitMutation.data.jiraIssueKey ?? "pending"})
            </p>
          )}
          {submitMutation.isError && (
            <p className="request-error">Submission failed: {submitMutation.error.message}</p>
          )}
        </form>
      )}
    </>
  );
}

function ControllerSoftwareRequestPage() {
  const navigate = useNavigate();

  return (
    <PageBody>
      <PageHeader
        icon={<Cpu size={18} />}
        title="Controller Software Request"
        badges={
          <>
            <PageHeaderBadge>Desktop First</PageHeaderBadge>
            <PageHeaderBadge>Version Aware</PageHeaderBadge>
          </>
        }
      />

      <PageSection
        title="Request Form"
        icon={<ClipboardList size={16} />}
        badges={<SectionBadge tone="brand">Rich Text + Attachment</SectionBadge>}
      >
        <div className="request-type-card">
          <span className="request-type-card__icon">
            <Cpu size={18} aria-hidden="true" />
          </span>
          <div className="request-type-card__body">
            <p className="request-type-card__eyebrow">What can we help you with?</p>
            <h3 className="request-type-card__title">Controller Software Request</h3>
          </div>
          <Link to={ROUTE_PATHS.ticketRequest} className="btn-secondary request-type-card__action">
            Change request type
          </Link>
        </div>

        <ControllerSoftwareRequestForm onCancel={() => navigate(ROUTE_PATHS.ticketRequest)} />
      </PageSection>
    </PageBody>
  );
}

// --- Ticket Request Settings ---

type OptionEditState = {
  code: string;
  name: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

const BLANK_OPTION_STATE: OptionEditState = { code: "", name: "", description: "", sortOrder: "0", isActive: true };

function SettingOptionTable({
  title,
  groupKey,
}: {
  title: string;
  groupKey: MasterDataGroupValue;
}) {
  const queryClient = useQueryClient();
  const queryKey = ["setting-options", groupKey];

  const optionsQuery = useQuery({
    queryKey,
    queryFn: () => fetchMasterDataOptionsByGroup(groupKey),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [editState, setEditState] = useState<OptionEditState>(BLANK_OPTION_STATE);

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: (input: CreateMasterDataOptionInput) => createMasterDataOption(input),
    onSuccess: () => { setAddingNew(false); setEditState(BLANK_OPTION_STATE); invalidate(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMasterDataOptionInput }) =>
      updateMasterDataOption(id, input),
    onSuccess: () => { setEditingId(null); invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMasterDataOption,
    onSuccess: () => invalidate(),
  });

  const toggleMutation = useMutation({
    mutationFn: toggleMasterDataOptionActive,
    onSuccess: () => invalidate(),
  });

  const updateEdit = <K extends keyof OptionEditState>(key: K, value: OptionEditState[K]) =>
    setEditState((s) => ({ ...s, [key]: value }));

  const toEditInput = (): UpdateMasterDataOptionInput => ({
    code: editState.code.trim(),
    name: editState.name.trim(),
    description: editState.description.trim() || undefined,
    sortOrder: Number(editState.sortOrder) || 0,
    isActive: editState.isActive,
  });

  const startEdit = (option: MasterDataOption) => {
    setAddingNew(false);
    setEditingId(option.id);
    setEditState({
      code: option.code,
      name: option.name,
      description: option.description ?? "",
      sortOrder: String(option.sortOrder),
      isActive: option.isActive,
    });
  };

  const cancelEdit = () => { setEditingId(null); setAddingNew(false); setEditState(BLANK_OPTION_STATE); };

  const startAdd = (currentCount: number) => {
    setEditingId(null);
    setAddingNew(true);
    setEditState({ ...BLANK_OPTION_STATE, sortOrder: String(currentCount) });
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`"${name}"을(를) 삭제하시겠습니까?`)) {
      deleteMutation.mutate(id);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const mutationError =
    createMutation.error?.message ??
    updateMutation.error?.message ??
    deleteMutation.error?.message ??
    null;

  const sorted = [...(optionsQuery.data ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );

  return (
    <PageSection
      title={title}
      badges={<SectionBadge>{sorted.length} items</SectionBadge>}
      actions={
        <button
          type="button"
          className="btn-primary setting-action-btn"
          onClick={() => startAdd(sorted.length)}
          disabled={addingNew || editingId !== null}
        >
          + Add Item
        </button>
      }
    >
      {optionsQuery.isPending && <p className="panel-text-muted text-sm">Loading...</p>}
      {optionsQuery.isError && <p className="request-error">Failed to load options: {optionsQuery.error.message}</p>}
      {mutationError && <p className="request-error mb-2">{mutationError}</p>}

      {!optionsQuery.isPending && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 w-16">Order</th>
                <th className="text-left px-3 py-2 w-32">Code</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Description</th>
                <th className="text-left px-3 py-2 w-24">Active</th>
                <th className="text-left px-3 py-2 w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((option) =>
                editingId === option.id ? (
                  <tr key={option.id}>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="form-input setting-input-order"
                        value={editState.sortOrder}
                        onChange={(e) => updateEdit("sortOrder", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input className="form-input" value={editState.code} onChange={(e) => updateEdit("code", e.target.value)} />
                    </td>
                    <td className="px-3 py-2">
                      <input className="form-input" value={editState.name} onChange={(e) => updateEdit("name", e.target.value)} />
                    </td>
                    <td className="px-3 py-2">
                      <input className="form-input" value={editState.description} onChange={(e) => updateEdit("description", e.target.value)} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={editState.isActive} onChange={(e) => updateEdit("isActive", e.target.checked)} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-primary setting-row-btn"
                          onClick={() => updateMutation.mutate({ id: option.id, input: toEditInput() })}
                          disabled={isSubmitting}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn-ghost setting-row-btn"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={option.id}>
                    <td className="px-3 py-2 text-slate-500">{option.sortOrder}</td>
                    <td className="px-3 py-2 font-mono text-xs">{option.code}</td>
                    <td className="px-3 py-2 font-medium">{option.name}</td>
                    <td className="px-3 py-2 text-slate-400 text-xs">{option.description ?? "-"}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        className={clsx(
                          "setting-badge",
                          option.isActive ? "setting-badge--active" : "setting-badge--inactive",
                        )}
                        onClick={() => toggleMutation.mutate(option.id)}
                        disabled={toggleMutation.isPending}
                        title={option.isActive ? "Click to deactivate" : "Click to activate"}
                      >
                        {option.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-ghost setting-row-btn"
                          onClick={() => startEdit(option)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-ghost setting-row-btn setting-row-btn--danger"
                          onClick={() => handleDelete(option.id, option.name)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
              {addingNew && (
                <tr>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="form-input setting-input-order"
                      value={editState.sortOrder}
                      onChange={(e) => updateEdit("sortOrder", e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input className="form-input" value={editState.code} onChange={(e) => updateEdit("code", e.target.value)} placeholder="CODE" />
                  </td>
                  <td className="px-3 py-2">
                    <input className="form-input" value={editState.name} onChange={(e) => updateEdit("name", e.target.value)} placeholder="Name" />
                  </td>
                  <td className="px-3 py-2">
                    <input className="form-input" value={editState.description} onChange={(e) => updateEdit("description", e.target.value)} placeholder="Optional description" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" checked={editState.isActive} onChange={(e) => updateEdit("isActive", e.target.checked)} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-primary setting-row-btn"
                        onClick={() =>
                          createMutation.mutate({ ...toEditInput(), optionGroup: groupKey })
                        }
                        disabled={isSubmitting}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn-ghost setting-row-btn"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {sorted.length === 0 && !addingNew && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    No items yet. Click &ldquo;+ Add Item&rdquo; to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageSection>
  );
}

function PumpTestRigSettingPage() {
  return (
    <PageBody>
      <PageHeader
        icon={<Settings size={18} />}
        title="Pump Test Rig Request — Setting"
        badges={
          <>
            <PageHeaderBadge>Master Data</PageHeaderBadge>
            <PageHeaderBadge>DB Connected</PageHeaderBadge>
          </>
        }
      />
      <SettingOptionTable title="Rig Types" groupKey={MASTER_DATA_GROUPS.rigTypes} />
      <SettingOptionTable title="Issue Types" groupKey={MASTER_DATA_GROUPS.issueTypes} />
      <SettingOptionTable title="Issued Sites" groupKey={MASTER_DATA_GROUPS.issuedSites} />
      <SettingOptionTable title="Products" groupKey={MASTER_DATA_GROUPS.products} />
      <SettingOptionTable title="Categories" groupKey={MASTER_DATA_GROUPS.categories} />
      <SettingOptionTable title="Priorities" groupKey={MASTER_DATA_GROUPS.priorities} />
      <SettingOptionTable title="Request Sources" groupKey={MASTER_DATA_GROUPS.requestSources} />
    </PageBody>
  );
}

function ControllerSoftwareSettingPage() {
  return (
    <PageBody>
      <PageHeader
        icon={<Settings size={18} />}
        title="Controller Software Request — Setting"
        badges={
          <>
            <PageHeaderBadge>Master Data</PageHeaderBadge>
            <PageHeaderBadge>DB Connected</PageHeaderBadge>
          </>
        }
      />
      <SettingOptionTable title="Controller Types" groupKey={MASTER_DATA_GROUPS.controllerTypes} />
      <SettingOptionTable title="Software Main Versions" groupKey={MASTER_DATA_GROUPS.softwareMainVersions} />
      <SettingOptionTable title="Software Sub Versions" groupKey={MASTER_DATA_GROUPS.softwareSubVersions} />
      <SettingOptionTable title="Products" groupKey={MASTER_DATA_GROUPS.products} />
      <SettingOptionTable title="Categories" groupKey={MASTER_DATA_GROUPS.categories} />
      <SettingOptionTable title="Priorities" groupKey={MASTER_DATA_GROUPS.priorities} />
      <SettingOptionTable title="Request Sources" groupKey={MASTER_DATA_GROUPS.requestSources} />
    </PageBody>
  );
}

function TicketRequestHubPage() {
  return (
    <PageBody>
      <PageHeader
        icon={<ClipboardList size={18} />}
        title="Ticket Request"
        badges={
          <>
            <PageHeaderBadge>Custom UX</PageHeaderBadge>
            <PageHeaderBadge>Jira-ready architecture</PageHeaderBadge>
          </>
        }
      />

      <PageSection title="Request Types" icon={<ClipboardList size={16} />} badges={<SectionBadge tone="brand">2 Templates</SectionBadge>}>
        <div className="grid gap-5 lg:grid-cols-2">
          <Link to={ROUTE_PATHS.pumpTestRigRequest} className="section-card rounded-[1.2rem] p-6 transition hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-ring">
            <div className="section-card__eyebrow">Ticket Request</div>
            <h2 className="section-card__title text-xl">Pump Test Rig Request</h2>
            <p className="panel-text-muted mt-2 text-sm leading-6">Issue-centric request with rig details, site, category, and rich-text evidence.</p>
          </Link>
          <Link to={ROUTE_PATHS.controllerSoftwareRequest} className="section-card rounded-[1.2rem] p-6 transition hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-ring">
            <div className="section-card__eyebrow">Ticket Request</div>
            <h2 className="section-card__title text-xl">Controller Software Request</h2>
            <p className="panel-text-muted mt-2 text-sm leading-6">Version-aware request form supporting custom Main/Sub version entries.</p>
          </Link>
        </div>
      </PageSection>
    </PageBody>
  );
}

const HELP_CENTER_REQUEST_TYPES = [
  {
    id: "pump-test-rig",
    label: "Pump Test Rig Request",
    description: "Report pump test rig issues with rig type, issued site, and reproduction evidence.",
    icon: <FlaskConical size={18} aria-hidden="true" />,
  },
  {
    id: "controller-software",
    label: "Controller Software Request",
    description: "Raise controller software issues including main and sub version details.",
    icon: <Cpu size={18} aria-hidden="true" />,
  },
] as const;

type HelpCenterRequestTypeId = (typeof HELP_CENTER_REQUEST_TYPES)[number]["id"];

function HelpCenterPage() {
  const [requestTypeId, setRequestTypeId] = useState<HelpCenterRequestTypeId>("pump-test-rig");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  // Bumping the instance remounts the active form, which is how Cancel clears entered values.
  const [formInstance, setFormInstance] = useState(0);

  const selectedType = HELP_CENTER_REQUEST_TYPES.find((type) => type.id === requestTypeId) ?? HELP_CENTER_REQUEST_TYPES[0];
  const visibleTypes = HELP_CENTER_REQUEST_TYPES.filter((type) => isPickerOpen || type.id === requestTypeId);

  const selectRequestType = (nextId: HelpCenterRequestTypeId) => {
    if (nextId !== requestTypeId) setFormInstance((instance) => instance + 1);
    setRequestTypeId(nextId);
    setIsPickerOpen(false);
  };

  const resetForm = () => {
    setFormInstance((instance) => instance + 1);
    setIsPickerOpen(false);
  };

  return (
    <PageBody>
      <PageHeader
        icon={<LifeBuoy size={18} />}
        title={HELP_CENTER_PORTAL_NAME}
        badges={
          <>
            <PageHeaderBadge>Help Center</PageHeaderBadge>
            <PageHeaderBadge>Self Service Portal</PageHeaderBadge>
          </>
        }
      />

      <PageSection
        title="Raise a request"
        icon={<ClipboardList size={16} />}
        badges={<SectionBadge tone="brand">{HELP_CENTER_REQUEST_TYPES.length} request types</SectionBadge>}
      >
        <p className="portal-intro">
          Welcome! You can raise a request for {HELP_CENTER_PORTAL_NAME} using the options provided.
        </p>

        <div className="portal-picker">
          <div className="portal-picker__header">
            <span className="portal-picker__label" id="help-center-picker-label">What can we help you with?</span>
            <button
              type="button"
              className="btn-secondary portal-picker__toggle"
              aria-expanded={isPickerOpen}
              aria-controls="help-center-request-types"
              onClick={() => setIsPickerOpen((open) => !open)}
            >
              <PencilLine size={14} aria-hidden="true" />
              Edit request type
            </button>
          </div>

          <ul id="help-center-request-types" className="portal-picker__list" aria-labelledby="help-center-picker-label">
            {visibleTypes.map((type) => (
              <li key={type.id}>
                <button
                  type="button"
                  className={clsx(
                    "request-type-card request-type-card--option",
                    type.id === requestTypeId && "request-type-card--selected",
                  )}
                  aria-pressed={type.id === requestTypeId}
                  aria-expanded={isPickerOpen ? undefined : false}
                  aria-controls={isPickerOpen ? undefined : "help-center-request-types"}
                  onClick={() => (isPickerOpen ? selectRequestType(type.id) : setIsPickerOpen(true))}
                >
                  <span className="request-type-card__icon">{type.icon}</span>
                  <span className="request-type-card__body">
                    <span className="request-type-card__title">{type.label}</span>
                    <span className="request-type-card__eyebrow">{type.description}</span>
                  </span>
                  {!isPickerOpen && <ChevronDown size={16} aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {selectedType.id === "pump-test-rig" ? (
          <PumpTestRigRequestForm key={`pump-${formInstance}`} onCancel={resetForm} />
        ) : (
          <ControllerSoftwareRequestForm key={`controller-${formInstance}`} onCancel={resetForm} />
        )}
      </PageSection>
    </PageBody>
  );
}

export function App() {
  return (
    <PlatformAppShell
      homePath={ROUTE_PATHS.ticketRequest}
      platformRoutes={{
        authBranding: {
          productName: "SEM SW Ticket System",
          logoSrc: EDWARDS_LOGO_SRC,
          logoAlt: "Edwards",
        },
      }}
      layout={{
        navTree,
        branding,
        pageStatusResolver: () => null,
        headerBreadcrumbResolver: getHeaderNavBreadcrumbs,
      }}
      productRoutes={[
        { index: true, element: <TicketRequestHubPage /> },
        { path: ROUTE_PATHS.overview, element: <OverviewPage /> },
        { path: ROUTE_PATHS.dashboard, element: <DashboardPage /> },
        { path: ROUTE_PATHS.legacyDashboard, element: <DashboardPage /> },
        { path: ROUTE_PATHS.helpCenter, element: <HelpCenterPage /> },
        { path: ROUTE_PATHS.ticketRequest, element: <TicketRequestHubPage /> },
        { path: ROUTE_PATHS.pumpTestRigRequest, element: <PumpTestRigRequestPage /> },
        { path: ROUTE_PATHS.controllerSoftwareRequest, element: <ControllerSoftwareRequestPage /> },
        { path: ROUTE_PATHS.ticketRequestSetting, element: <PumpTestRigSettingPage /> },
        { path: ROUTE_PATHS.pumpTestRigSetting, element: <PumpTestRigSettingPage /> },
        { path: ROUTE_PATHS.controllerSoftwareSetting, element: <ControllerSoftwareSettingPage /> },
      ]}
    />
  );
}
