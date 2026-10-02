import { BarChart3, ClipboardList, Compass, Cpu, FlaskConical, LifeBuoy, Settings } from "lucide-react";
import { matchPath } from "react-router-dom";
import { UserRole } from "@sem/platform-shared";
import { EDWARDS_ICON_SRC, EDWARDS_LOGO_SRC } from "@sem/platform-frontend";
import { activeNavLabelFromPath, type NavTreeItem } from "@sem/platform-frontend/features/navigation";
import type { MainLayoutBranding, MainLayoutHeaderBreadcrumbResolverArgs } from "@sem/platform-frontend/layouts";


export const ROUTE_PATHS = {
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

export const navTree: NavTreeItem[] = [
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

export const HELP_CENTER_PORTAL_NAME = "PCCA SEM S/W";

export const destinationDescriptions: Record<string, string> = {
  dashboard: "Starter metrics and replacement points for a derived SEM SW application.",
  "pump-test-rig-request": "Submit and track Pump Test Rig issues with standard templates and attachments.",
  "controller-software-request": "Submit controller software issues including version details and reproducible evidence.",
};

export const branding: MainLayoutBranding = {
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

export function getHeaderNavBreadcrumbs({ pathname, navTrail, moreTrail }: MainLayoutHeaderBreadcrumbResolverArgs) {
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
