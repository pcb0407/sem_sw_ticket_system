import { EDWARDS_LOGO_SRC } from "@sem/platform-frontend";
import { PlatformAppShell } from "@sem/platform-frontend/app";
import { ROUTE_PATHS, navTree, branding, getHeaderNavBreadcrumbs } from "./features/tickets/ticketNavigation";
import { lazy } from "react";

const OverviewPage = lazy(() => import("./features/tickets/TicketPortal").then(module => ({ default: module.OverviewPage })));
const DashboardPage = lazy(() => import("./features/tickets/TicketPortal").then(module => ({ default: module.DashboardPage })));
const HelpCenterPage = lazy(() => import("./features/tickets/TicketPortal").then(module => ({ default: module.HelpCenterPage })));
const TicketRequestHubPage = lazy(() => import("./features/tickets/TicketPortal").then(module => ({ default: module.TicketRequestHubPage })));
const PumpTestRigRequestPage = lazy(() => import("./features/tickets/PumpRequest").then(module => ({ default: module.PumpTestRigRequestPage })));
const ControllerSoftwareRequestPage = lazy(() => import("./features/tickets/ControllerRequest").then(module => ({ default: module.ControllerSoftwareRequestPage })));
const PumpTestRigSettingPage = lazy(() => import("./features/tickets/TicketSettings").then(module => ({ default: module.PumpTestRigSettingPage })));
const ControllerSoftwareSettingPage = lazy(() => import("./features/tickets/TicketSettings").then(module => ({ default: module.ControllerSoftwareSettingPage })));

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
