import { BarChart3, Compass, ListChecks } from "lucide-react";
import { Link, matchPath } from "react-router-dom";
import clsx from "clsx";
import { UserRole } from "@sem/platform-shared";
import { EDWARDS_ICON_SRC, EDWARDS_LOGO_SRC } from "@sem/platform-frontend";
import { PlatformAppShell } from "@sem/platform-frontend/app";
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

const ROUTE_PATHS = {
  overview: "/overview",
  dashboard: "/overview/dashboard",
  legacyDashboard: "/overview/ticket-system",
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
];

const destinationDescriptions: Record<string, string> = {
  dashboard: "Starter metrics and replacement points for a derived SEM SW application.",
};

const branding: MainLayoutBranding = {
  productName: "SEM SW Ticket System",
  productTag: "Web Template",
  logoSrc: EDWARDS_LOGO_SRC,
  logoAlt: "Edwards",
  iconSrc: EDWARDS_ICON_SRC,
  iconAlt: "Edwards E",
  homePath: ROUTE_PATHS.dashboard,
  headerHomePath: ROUTE_PATHS.overview,
  rootBreadcrumbLabel: "Web Template",
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

  if (navTrail.length > 0) return navTrail;
  if (moreTrail.length > 0) return moreTrail;

  return [
    { label: "Overview", to: ROUTE_PATHS.overview },
    { label: activeNavLabelFromPath(pathname) },
  ];
}

function OverviewPage() {
  const overviewSection = navTree.find((item) => item.id === "overview");
  const overviewCards = overviewSection?.children ?? [];

  return (
    <PageBody>
      <PageHeader
        icon={<ListChecks size={18} />}
        title="Overview Entry"
        badges={
          <>
            <PageHeaderBadge>{overviewCards.length} destinations</PageHeaderBadge>
            <PageHeaderBadge>Overview group</PageHeaderBadge>
          </>
        }
      />

      <section className="grid gap-5 lg:grid-cols-2">
        {overviewCards.map((card) => (
          <Link
            key={card.id}
            to={card.to}
            className={clsx(
              "section-card rounded-[1.6rem] p-6 transition duration-200",
              "hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-ring",
            )}
          >
            <div className="section-card__header border-b-0 !bg-transparent !p-0">
              <div className="section-card__copy">
                <div className="section-card__title-row">
                  <div className="min-w-0">
                    <div className="section-card__eyebrow">{overviewSection?.label ?? "Overview"}</div>
                    <h2 className="section-card__title text-2xl">{card.label}</h2>
                  </div>
                </div>
              </div>
              <div className="section-card__aside">
                <SectionBadge tone="brand">{overviewSection?.label ?? "Overview"}</SectionBadge>
              </div>
            </div>

            <div className="mt-2 space-y-2">
              <p className="panel-text-muted text-sm leading-6">{destinationDescriptions[card.id]}</p>
            </div>

            <div className="panel-divider mt-8 flex items-center justify-between border-t pt-4 text-sm">
              <span className="panel-text-muted font-medium">Open workspace</span>
              <span className="theme-text-info font-semibold">Continue</span>
            </div>
          </Link>
        ))}
      </section>
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
          <InfoCard label="Platform shell" value="READY" labelVariant="title" />
          <InfoCard label="Customization" value="OPEN" labelVariant="title" />
        </div>
      </PageSection>
    </PageBody>
  );
}

export function App() {
  return (
    <PlatformAppShell
      homePath={ROUTE_PATHS.dashboard}
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
        { index: true, element: <DashboardPage /> },
        { path: ROUTE_PATHS.overview, element: <OverviewPage /> },
        { path: ROUTE_PATHS.dashboard, element: <DashboardPage /> },
        { path: ROUTE_PATHS.legacyDashboard, element: <DashboardPage /> },
      ]}
    />
  );
}
