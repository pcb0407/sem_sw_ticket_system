import { useEffect, useRef, useState, type DragEvent } from "react";
import { Paperclip, X } from "lucide-react";
import clsx from "clsx";
import type { MasterDataOption } from "@ticket-system/shared";


export type RichTextEditorProps = {
  label: string;
  value: string;
  onChange: (html: string) => void;
  required?: boolean;
  error?: string;
};

export function RichTextEditor({ label, value, onChange, required = false, error }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const runCommand = (command: string) => {
    document.execCommand(command);
    onChange(editorRef.current?.innerHTML ?? "");
  };

  return (
    <div className="request-field">
      <label className="request-label">
        {label}
        {required && <span className="request-required"> *</span>}
      </label>
      <div className="editor-shell">
        <div className="editor-toolbar">
          <button type="button" className="editor-tool-btn" onClick={() => runCommand("bold")}>B</button>
          <button type="button" className="editor-tool-btn" onClick={() => runCommand("italic")}>I</button>
          <button type="button" className="editor-tool-btn" onClick={() => runCommand("insertUnorderedList")}>List</button>
        </div>
        <div
          ref={editorRef}
          className="editor-content"
          contentEditable
          role="textbox"
          aria-label={label}
          onInput={(event) => onChange((event.currentTarget as HTMLDivElement).innerHTML)}
          suppressContentEditableWarning
        />
      </div>
      {error && <p className="request-error">{error}</p>}
    </div>
  );
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isSameFile(left: File, right: File) {
  return left.name === right.name && left.size === right.size && left.lastModified === right.lastModified;
}

export type AttachmentDropzoneProps = {
  files: File[];
  onChange: (files: File[]) => void;
};

export function AttachmentDropzone({ files, onChange }: AttachmentDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const appendFiles = (incoming: FileList | null) => {
    const added = Array.from(incoming ?? []);
    if (added.length === 0) return;

    const merged = [...files];
    for (const file of added) {
      if (!merged.some((existing) => isSameFile(existing, file))) merged.push(file);
    }
    onChange(merged);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    appendFiles(event.dataTransfer.files);
  };

  return (
    <div className="request-field request-field--wide">
      <span className="request-label" id="attachment-dropzone-label">Attachment</span>
      <div
        className={clsx("attachment-dropzone", isDragging && "attachment-dropzone--active")}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <Paperclip size={16} aria-hidden="true" />
        <span>
          Drop files to attach or{" "}
          <button type="button" className="attachment-browse" onClick={() => inputRef.current?.click()}>
            browse
          </button>
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          aria-labelledby="attachment-dropzone-label"
          onChange={(event) => {
            appendFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {files.length > 0 && (
        <ul className="attachment-list">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`} className="attachment-item">
              <span className="attachment-item__name">{file.name}</span>
              <span className="attachment-item__size">{formatFileSize(file.size)}</span>
              <button
                type="button"
                className="attachment-item__remove"
                aria-label={`Remove ${file.name}`}
                onClick={() => onChange(files.filter((existing) => !isSameFile(existing, file)))}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function optionItems(options: MasterDataOption[]) {
  return options
    .filter((option) => option.isActive)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((option) => (
      <option key={option.id} value={option.id}>{option.name}</option>
    ));
}

export function sanitizeRichText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const DEFAULT_PUMP_TEMPLATE = [
  "Attachment",
  "- FTCR Template",
  "",
  "Attachment",
  "- Test SW Requirement Template",
  "",
  "Comment Added",
  "- If regarding activation code, please provide Request Code and Email Address",
  "",
  "Comment Added",
  "- Pump P/N",
  "- Pre-condition",
  "- Test Rig Name (Location)",
  "- Problem / Issue",
].join("<br />");

export function MasterDataStatus({ query }: { query: { isPending: boolean; isError: boolean; error: Error | null } }) {
  if (query.isPending) {
    return <p className="panel-text-muted text-sm">Loading master data from seeded database tables...</p>;
  }
  if (query.isError) {
    return <p className="request-error">Master data load failed: {query.error?.message ?? "unknown error"}</p>;
  }
  return null;
}

export type RequestFormProps = {
  onCancel: () => void;
};
