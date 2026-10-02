import { useState } from "react";
import { BarChart3, ChevronDown, ClipboardList, Cpu, FlaskConical, LifeBuoy, ListChecks, PencilLine } from "lucide-react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { InfoCard, PageBody, PageHeader, PageHeaderBadge, PageSection, SectionBadge } from "@sem/platform-frontend/components";
import { navTree, destinationDescriptions, ROUTE_PATHS, HELP_CENTER_PORTAL_NAME } from "./ticketNavigation";
import { PumpTestRigRequestForm } from "./PumpRequest";
import { ControllerSoftwareRequestForm } from "./ControllerRequest";


export function OverviewPage() {
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

export function DashboardPage() {
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

export function TicketRequestHubPage() {
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

export const HELP_CENTER_REQUEST_TYPES = [
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

export type HelpCenterRequestTypeId = (typeof HELP_CENTER_REQUEST_TYPES)[number]["id"];

export function HelpCenterPage() {
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
