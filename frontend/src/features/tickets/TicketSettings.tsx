import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import clsx from "clsx";
import { PageBody, PageHeader, PageHeaderBadge, PageSection, SectionBadge } from "@sem/platform-frontend/components";
import type { CreateMasterDataOptionInput, MasterDataGroupValue, MasterDataOption, UpdateMasterDataOptionInput } from "@ticket-system/shared";
import { MASTER_DATA_GROUPS } from "@ticket-system/shared";
import { createMasterDataOption, deleteMasterDataOption, fetchMasterDataOptionsByGroup, toggleMasterDataOptionActive, updateMasterDataOption } from "../../services/ticketRequestApi";


export type OptionEditState = {
  code: string;
  name: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

export const BLANK_OPTION_STATE: OptionEditState = { code: "", name: "", description: "", sortOrder: "0", isActive: true };

export function SettingOptionTable({
  title,
  groupKey,
}: {
  title: string;
  groupKey: MasterDataGroupValue;
}) {
  const queryClient = useQueryClient();
  const queryKey = ["setting-options", groupKey];

  const optionsQuery = useQuery({
    queryKey,
    queryFn: () => fetchMasterDataOptionsByGroup(groupKey),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [editState, setEditState] = useState<OptionEditState>(BLANK_OPTION_STATE);

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: (input: CreateMasterDataOptionInput) => createMasterDataOption(input),
    onSuccess: () => { setAddingNew(false); setEditState(BLANK_OPTION_STATE); invalidate(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMasterDataOptionInput }) =>
      updateMasterDataOption(id, input),
    onSuccess: () => { setEditingId(null); invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMasterDataOption,
    onSuccess: () => invalidate(),
  });

  const toggleMutation = useMutation({
    mutationFn: toggleMasterDataOptionActive,
    onSuccess: () => invalidate(),
  });

  const updateEdit = <K extends keyof OptionEditState>(key: K, value: OptionEditState[K]) =>
    setEditState((s) => ({ ...s, [key]: value }));

  const toEditInput = (): UpdateMasterDataOptionInput => ({
    code: editState.code.trim(),
    name: editState.name.trim(),
    description: editState.description.trim() || undefined,
    sortOrder: Number(editState.sortOrder) || 0,
    isActive: editState.isActive,
  });

  const startEdit = (option: MasterDataOption) => {
    setAddingNew(false);
    setEditingId(option.id);
    setEditState({
      code: option.code,
      name: option.name,
      description: option.description ?? "",
      sortOrder: String(option.sortOrder),
      isActive: option.isActive,
    });
  };

  const cancelEdit = () => { setEditingId(null); setAddingNew(false); setEditState(BLANK_OPTION_STATE); };

  const startAdd = (currentCount: number) => {
    setEditingId(null);
    setAddingNew(true);
    setEditState({ ...BLANK_OPTION_STATE, sortOrder: String(currentCount) });
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`"${name}"을(를) 삭제하시겠습니까?`)) {
      deleteMutation.mutate(id);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const mutationError =
    createMutation.error?.message ??
    updateMutation.error?.message ??
    deleteMutation.error?.message ??
    null;

  const sorted = [...(optionsQuery.data ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );

  return (
    <PageSection
      title={title}
      badges={<SectionBadge>{sorted.length} items</SectionBadge>}
      actions={
        <button
          type="button"
          className="btn-primary setting-action-btn"
          onClick={() => startAdd(sorted.length)}
          disabled={addingNew || editingId !== null}
        >
          + Add Item
        </button>
      }
    >
      {optionsQuery.isPending && <p className="panel-text-muted text-sm">Loading...</p>}
      {optionsQuery.isError && <p className="request-error">Failed to load options: {optionsQuery.error.message}</p>}
      {mutationError && <p className="request-error mb-2">{mutationError}</p>}

      {!optionsQuery.isPending && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 w-16">Order</th>
                <th className="text-left px-3 py-2 w-32">Code</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Description</th>
                <th className="text-left px-3 py-2 w-24">Active</th>
                <th className="text-left px-3 py-2 w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((option) =>
                editingId === option.id ? (
                  <tr key={option.id}>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="form-input setting-input-order"
                        value={editState.sortOrder}
                        onChange={(e) => updateEdit("sortOrder", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input className="form-input" value={editState.code} onChange={(e) => updateEdit("code", e.target.value)} />
                    </td>
                    <td className="px-3 py-2">
                      <input className="form-input" value={editState.name} onChange={(e) => updateEdit("name", e.target.value)} />
                    </td>
                    <td className="px-3 py-2">
                      <input className="form-input" value={editState.description} onChange={(e) => updateEdit("description", e.target.value)} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={editState.isActive} onChange={(e) => updateEdit("isActive", e.target.checked)} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-primary setting-row-btn"
                          onClick={() => updateMutation.mutate({ id: option.id, input: toEditInput() })}
                          disabled={isSubmitting}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn-ghost setting-row-btn"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={option.id}>
                    <td className="px-3 py-2 text-slate-500">{option.sortOrder}</td>
                    <td className="px-3 py-2 font-mono text-xs">{option.code}</td>
                    <td className="px-3 py-2 font-medium">{option.name}</td>
                    <td className="px-3 py-2 text-slate-400 text-xs">{option.description ?? "-"}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        className={clsx(
                          "setting-badge",
                          option.isActive ? "setting-badge--active" : "setting-badge--inactive",
                        )}
                        onClick={() => toggleMutation.mutate(option.id)}
                        disabled={toggleMutation.isPending}
                        title={option.isActive ? "Click to deactivate" : "Click to activate"}
                      >
                        {option.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-ghost setting-row-btn"
                          onClick={() => startEdit(option)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-ghost setting-row-btn setting-row-btn--danger"
                          onClick={() => handleDelete(option.id, option.name)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
              {addingNew && (
                <tr>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="form-input setting-input-order"
                      value={editState.sortOrder}
                      onChange={(e) => updateEdit("sortOrder", e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input className="form-input" value={editState.code} onChange={(e) => updateEdit("code", e.target.value)} placeholder="CODE" />
                  </td>
                  <td className="px-3 py-2">
                    <input className="form-input" value={editState.name} onChange={(e) => updateEdit("name", e.target.value)} placeholder="Name" />
                  </td>
                  <td className="px-3 py-2">
                    <input className="form-input" value={editState.description} onChange={(e) => updateEdit("description", e.target.value)} placeholder="Optional description" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" checked={editState.isActive} onChange={(e) => updateEdit("isActive", e.target.checked)} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-primary setting-row-btn"
                        onClick={() =>
                          createMutation.mutate({ ...toEditInput(), optionGroup: groupKey })
                        }
                        disabled={isSubmitting}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn-ghost setting-row-btn"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {sorted.length === 0 && !addingNew && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    No items yet. Click &ldquo;+ Add Item&rdquo; to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageSection>
  );
}

export function PumpTestRigSettingPage() {
  return (
    <PageBody>
      <PageHeader
        icon={<Settings size={18} />}
        title="Pump Test Rig Request — Setting"
        badges={
          <>
            <PageHeaderBadge>Master Data</PageHeaderBadge>
            <PageHeaderBadge>DB Connected</PageHeaderBadge>
          </>
        }
      />
      <SettingOptionTable title="Rig Types" groupKey={MASTER_DATA_GROUPS.rigTypes} />
      <SettingOptionTable title="Issue Types" groupKey={MASTER_DATA_GROUPS.issueTypes} />
      <SettingOptionTable title="Issued Sites" groupKey={MASTER_DATA_GROUPS.issuedSites} />
      <SettingOptionTable title="Products" groupKey={MASTER_DATA_GROUPS.products} />
      <SettingOptionTable title="Categories" groupKey={MASTER_DATA_GROUPS.categories} />
      <SettingOptionTable title="Priorities" groupKey={MASTER_DATA_GROUPS.priorities} />
      <SettingOptionTable title="Request Sources" groupKey={MASTER_DATA_GROUPS.requestSources} />
    </PageBody>
  );
}

export function ControllerSoftwareSettingPage() {
  return (
    <PageBody>
      <PageHeader
        icon={<Settings size={18} />}
        title="Controller Software Request — Setting"
        badges={
          <>
            <PageHeaderBadge>Master Data</PageHeaderBadge>
            <PageHeaderBadge>DB Connected</PageHeaderBadge>
          </>
        }
      />
      <SettingOptionTable title="Controller Types" groupKey={MASTER_DATA_GROUPS.controllerTypes} />
      <SettingOptionTable title="Software Main Versions" groupKey={MASTER_DATA_GROUPS.softwareMainVersions} />
      <SettingOptionTable title="Software Sub Versions" groupKey={MASTER_DATA_GROUPS.softwareSubVersions} />
      <SettingOptionTable title="Products" groupKey={MASTER_DATA_GROUPS.products} />
      <SettingOptionTable title="Categories" groupKey={MASTER_DATA_GROUPS.categories} />
      <SettingOptionTable title="Priorities" groupKey={MASTER_DATA_GROUPS.priorities} />
      <SettingOptionTable title="Request Sources" groupKey={MASTER_DATA_GROUPS.requestSources} />
    </PageBody>
  );
}
