import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ClipboardList, FlaskConical, UserRound, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@sem/platform-frontend/features/auth";
import { PageBody, PageHeader, PageHeaderBadge, PageSection, SectionBadge } from "@sem/platform-frontend/components";
import type { PumpTestRigRequestPayload } from "@ticket-system/shared";
import { fetchTicketRequestMasterData, submitPumpTestRigRequest } from "../../services/ticketRequestApi";
import { ROUTE_PATHS } from "./ticketNavigation";
import { RequestFormProps, DEFAULT_PUMP_TEMPLATE, sanitizeRichText, MasterDataStatus, optionItems, RichTextEditor, AttachmentDropzone } from "./TicketFormComponents";


export type PumpFormState = {
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

export function PumpTestRigRequestForm({ onCancel }: RequestFormProps) {
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

export function PumpTestRigRequestPage() {
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
