import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryColumn } from "typeorm";
import { TicketRequestAttachmentEntity } from "./ticket-request-attachment.entity";

@Entity({ name: "ticket_requests" })
@Index("idx_tr_type_created", ["requestType", "createdAtUtc"])
@Index("idx_tr_status_created", ["status", "createdAtUtc"])
export class TicketRequestEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ type: "varchar", length: 48 })
  requestType!: "pump-test-rig" | "controller-software";

  @Column({ type: "varchar", length: 120 })
  requester!: string;

  @Column({ type: "varchar", length: 500 })
  title!: string;

  @Column({ type: "varchar", length: 64 })
  priorityId!: string;

  @Column({ type: "varchar", length: 64 })
  productId!: string;

  @Column({ type: "varchar", length: 64 })
  requestSourceId!: string;

  @Column({ type: "varchar", length: 64 })
  categoryId!: string;

  @Column({ type: "date", nullable: true })
  dateFound!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  rigTypeId!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  issueTypeId!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  issuedSiteId!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  controllerTypeId!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  mainVersionId!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  mainVersionOther!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  subVersionId!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  subVersionOther!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  additionalCategoryId!: string | null;

  @Column({ type: "text" })
  descriptionHtml!: string;

  @Column({ type: "text" })
  stepsToReproduceHtml!: string;

  @Column({ type: "varchar", length: 64, nullable: true })
  jiraIssueKey!: string | null;

  @Column({ type: "varchar", length: 24, default: "accepted" })
  status!: "queued" | "accepted";

  @Column({ type: "varchar", length: 300 })
  message!: string;

  @CreateDateColumn({ type: "datetime" })
  createdAtUtc!: Date;

  @OneToMany(() => TicketRequestAttachmentEntity, (attachment) => attachment.ticketRequest, { cascade: false })
  attachments!: TicketRequestAttachmentEntity[];
}
