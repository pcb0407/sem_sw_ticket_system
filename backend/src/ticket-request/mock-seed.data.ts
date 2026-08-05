import type { TicketRequestMasterData } from "@ticket-system/shared";

function buildOption(id: string, code: string, name: string, sortOrder: number, description?: string) {
  return {
    id,
    code,
    name,
    sortOrder,
    description,
    isActive: true,
  };
}

export const TICKET_REQUEST_MASTER_DATA_SEED: TicketRequestMasterData = {
  products: [
    buildOption("prd-vacuum-pump", "VAC_PUMP", "Vacuum Pump", 10),
    buildOption("prd-controller", "CTRL", "Controller", 20),
    buildOption("prd-accessory", "ACC", "Accessory", 30),
  ],
  controllerTypes: [
    buildOption("ctrl-atlas", "ATLAS", "Atlas Controller", 10),
    buildOption("ctrl-genius", "GENIUS", "Genius Controller", 20),
    buildOption("ctrl-other", "OTHER", "Other", 99),
  ],
  rigTypes: [
    buildOption("rig-endurance", "ENDURANCE", "Endurance Rig", 10),
    buildOption("rig-performance", "PERFORMANCE", "Performance Rig", 20),
    buildOption("rig-thermal", "THERMAL", "Thermal Rig", 30),
  ],
  requestSources: [
    buildOption("src-field", "FIELD", "Field Report", 10),
    buildOption("src-lab", "LAB", "Lab Validation", 20),
    buildOption("src-customer", "CUSTOMER", "Customer Feedback", 30),
  ],
  categories: [
    buildOption("cat-defect", "DEFECT", "Defect", 10),
    buildOption("cat-enhancement", "ENHANCEMENT", "Enhancement", 20),
    buildOption("cat-question", "QUESTION", "Question", 30),
  ],
  issueTypes: [
    buildOption("issue-functional", "FUNCTIONAL", "Functional", 10),
    buildOption("issue-reliability", "RELIABILITY", "Reliability", 20),
    buildOption("issue-performance", "PERFORMANCE", "Performance", 30),
  ],
  issuedSites: [
    buildOption("site-kr-icheon", "KR_ICH", "Korea - Icheon", 10),
    buildOption("site-us-oregon", "US_OR", "US - Oregon", 20),
    buildOption("site-uk-crawley", "UK_CR", "UK - Crawley", 30),
  ],
  priorities: [
    buildOption("pri-critical", "CRITICAL", "Critical", 10),
    buildOption("pri-high", "HIGH", "High", 20),
    buildOption("pri-medium", "MEDIUM", "Medium", 30),
    buildOption("pri-low", "LOW", "Low", 40),
  ],
  softwareMainVersions: [
    buildOption("main-d37001001", "D37001001", "D37001001", 10),
    buildOption("main-d37001002", "D37001002", "D37001002", 20),
    buildOption("main-other", "OTHER", "Other", 99),
  ],
  softwareSubVersions: [
    buildOption("sub-a", "A", "A", 10),
    buildOption("sub-b", "B", "B", 20),
    buildOption("sub-c", "C", "C", 30),
    buildOption("sub-other", "OTHER", "Other", 99),
  ],
};
