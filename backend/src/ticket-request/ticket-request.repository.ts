import { Injectable } from "@nestjs/common";
import type { TicketRequestMasterData, TicketRequestMasterDataRepository } from "@ticket-system/shared";
import { TICKET_REQUEST_MASTER_DATA_SEED } from "./mock-seed.data";

@Injectable()
export class MockTicketRequestMasterDataRepository implements TicketRequestMasterDataRepository {
  async getMasterData(): Promise<TicketRequestMasterData> {
    return TICKET_REQUEST_MASTER_DATA_SEED;
  }
}
