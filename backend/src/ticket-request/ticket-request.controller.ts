import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type {
  ControllerSoftwareRequestPayload,
  PumpTestRigRequestPayload,
  TicketRequestSubmissionResponse,
} from "@ticket-system/shared";
import { TicketRequestService } from "./ticket-request.service";

@ApiTags("Ticket Requests")
@Controller("ticket-requests")
export class TicketRequestController {
  constructor(private readonly ticketRequestService: TicketRequestService) {}

  @Get("master-data")
  @ApiOperation({ summary: "Get master data for Ticket Request forms" })
  async getMasterData() {
    return this.ticketRequestService.getMasterData();
  }

  @Post("pump-test-rig")
  @ApiOperation({ summary: "Submit Pump Test Rig Request" })
  async submitPumpTestRigRequest(
    @Body() payload: PumpTestRigRequestPayload,
  ): Promise<TicketRequestSubmissionResponse> {
    return this.ticketRequestService.submitPumpTestRigRequest(payload);
  }

  @Post("controller-software")
  @ApiOperation({ summary: "Submit Controller Software Request" })
  async submitControllerSoftwareRequest(
    @Body() payload: ControllerSoftwareRequestPayload,
  ): Promise<TicketRequestSubmissionResponse> {
    return this.ticketRequestService.submitControllerSoftwareRequest(payload);
  }
}
