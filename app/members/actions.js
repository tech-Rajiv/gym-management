"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createMember,
  updateMember,
  deleteMember,
} from "@/lib/db/members";
import { parseMemberForm, validateMember } from "@/lib/validations/member";
import { isUniqueViolation } from "@/lib/db";

/**
 * Server Actions for the Members module.
 *
 * "use server" at the top of the file marks every export as a Server Action:
 * the browser calls them over the network, but the code only ever runs on the
 * server. That is what lets the form talk to PostgreSQL without an API route
 * in between, and it is why the database credentials never leave the server.
 *
 * The flow is always the same:
 *
 *     form  ->  action  ->  validation  ->  repository  ->  PostgreSQL
 *
 * Each layer has one job. Actions translate between the form and the database
 * and decide what the user sees; they contain no SQL and no date arithmetic.
 */

/**
 * Every failed action returns this shape, so the form has one thing to render.
 * `values` is sent back so a rejected submission keeps what was typed.
 */
function failure({ message = null, errors = {}, values }) {
  return { ok: false, message, errors, values };
}

/**
 * Turns a database error into something worth showing a gym owner.
 *
 * The unique constraints on phone and email are the two failures a user can
 * actually cause and fix, so they are reported against the field itself.
 * Anything else is unexpected and gets a general message - the real error is
 * already logged on the server by lib/db/index.js.
 */
function describeWriteError(error, values) {
  if (isUniqueViolation(error, "phone")) {
    return failure({
      errors: { phone: "A member with this phone number already exists." },
      values,
    });
  }

  if (isUniqueViolation(error, "email")) {
    return failure({
      errors: { email: "A member with this email address already exists." },
      values,
    });
  }

  return failure({
    message: error?.message ?? "Something went wrong. Please try again.",
    values,
  });
}

/**
 * Creates a member and their first membership.
 *
 * Called through `useActionState`, so it receives the previous state first and
 * the submitted form second.
 */
export async function createMemberAction(previousState, formData) {
  const input = parseMemberForm(formData);
  const { valid, errors, values } = validateMember(input);

  if (!valid) {
    return failure({ errors, values: input });
  }

  try {
    await createMember(values);
  } catch (error) {
    return describeWriteError(error, input);
  }

  // The dashboard counts and the members list both change, so both are
  // refreshed before the user lands on the list.
  revalidatePath("/members");
  revalidatePath("/dashboard");

  // redirect throws internally to stop the action, so it must sit outside the
  // try block above - otherwise the catch would swallow it.
  redirect("/members");
}

/** Updates a member's details and their current membership term. */
export async function updateMemberAction(memberId, previousState, formData) {
  const input = parseMemberForm(formData);
  const { valid, errors, values } = validateMember(input);

  if (!valid) {
    return failure({ errors, values: input });
  }

  try {
    const updated = await updateMember(memberId, values);
    if (!updated) {
      return failure({
        message: "This member no longer exists. They may have been deleted.",
        values: input,
      });
    }
  } catch (error) {
    return describeWriteError(error, input);
  }

  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/dashboard");

  redirect(`/members/${memberId}`);
}

/**
 * Deletes a member and, through ON DELETE CASCADE, their membership history.
 *
 * Returns rather than redirects on failure so the dialog can show why it did
 * not work instead of navigating away.
 */
export async function deleteMemberAction(memberId) {
  try {
    const deleted = await deleteMember(memberId);
    if (!deleted) {
      return { ok: false, message: "This member has already been deleted." };
    }
  } catch (error) {
    return {
      ok: false,
      message: error?.message ?? "Could not delete this member. Please try again.",
    };
  }

  revalidatePath("/members");
  revalidatePath("/dashboard");

  return { ok: true };
}
