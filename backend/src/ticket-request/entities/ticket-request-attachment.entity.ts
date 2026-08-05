import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { TicketRequestEntity } from "./ticket-request.entity";

@Entity({ name: "ticket_request_attachments" })
@Index("idx_tr_attachment_request", ["ticketRequestId"])
export class TicketRequestAttachmentEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ type: "varchar", length: 64 })
  ticketRequestId!: string;

  @ManyToOne(() => TicketRequestEntity, (ticketRequest) => ticketRequest.attachments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ticketRequestId", referencedColumnName: "id" })
  ticketRequest!: TicketRequestEntity;

  @Column({ type: "varchar", length: 260 })
  fileName!: string;

  @Column({ type: "bigint" })
  sizeBytes!: number;

  @Column({ type: "varchar", length: 100 })
  contentType!: string;

  @CreateDateColumn({ type: "datetime" })
  createdAtUtc!: Date;
}
