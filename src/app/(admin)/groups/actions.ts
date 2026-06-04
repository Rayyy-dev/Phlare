"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/guard";
import { groupSchema } from "@/lib/validation";
import {
  createGroup,
  updateGroup,
  softDeleteGroup,
  addMembers,
  removeMember,
  DuplicateGroupError,
} from "@/server/groups/service";

export interface GroupFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function parseGroup(formData: FormData) {
  return groupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
}

function fieldErrorsOf(result: ReturnType<typeof parseGroup>) {
  const fieldErrors: Record<string, string> = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function createGroupAction(
  _prev: GroupFormState,
  formData: FormData
): Promise<GroupFormState> {
  const admin = await requireAdmin();
  const parsed = parseGroup(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed) };

  try {
    await createGroup(parsed.data, admin.id);
  } catch (err) {
    if (err instanceof DuplicateGroupError) {
      return { fieldErrors: { name: "A group with this name already exists." } };
    }
    throw err;
  }

  revalidatePath("/groups");
  redirect("/groups");
}

export async function updateGroupAction(
  _prev: GroupFormState,
  formData: FormData
): Promise<GroupFormState> {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Missing group id." };

  const parsed = parseGroup(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed) };

  try {
    await updateGroup(id, parsed.data, admin.id);
  } catch (err) {
    if (err instanceof DuplicateGroupError) {
      return { fieldErrors: { name: "Another group already uses this name." } };
    }
    throw err;
  }

  revalidatePath("/groups");
  redirect(`/groups/${id}`);
}

export async function deleteGroupAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  await softDeleteGroup(id, admin.id);
  revalidatePath("/groups");
  redirect("/groups");
}

export async function addMembersAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const groupId = formData.get("groupId")?.toString();
  if (!groupId) return;
  const recipientIds = formData
    .getAll("recipientIds")
    .map((v) => v.toString())
    .filter(Boolean);
  await addMembers(groupId, recipientIds, admin.id);
  revalidatePath(`/groups/${groupId}`);
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const groupId = formData.get("groupId")?.toString();
  const recipientId = formData.get("recipientId")?.toString();
  if (!groupId || !recipientId) return;
  await removeMember(groupId, recipientId, admin.id);
  revalidatePath(`/groups/${groupId}`);
}
