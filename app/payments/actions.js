"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPayment,
  createPaymentWithMembership,
  deletePayment,
} from "@/lib/db/payments";
import { validatePayment } from "@/lib/validations/payment";

/**
 * Server Actions for the Payments module.
 *
 * The flow matches the Members module:
 *
 *     form  ->  action  ->  validation  ->  repository  ->  PostgreSQL
 *
 * Actions translate between the form and the database and decide what the
 * user sees. They contain no SQL and no date arithmetic.
 */

/** Every failed action returns this shape, so the form has one thing to render. */
function failure({ message = null, errors = {}, values }) {
  return { ok: false, message, errors, values };
}

/** Keeps what the owner typed, so a rejected submission is not retyped. */
function formValues(formData) {
  return Object.fromEntries(formData.entries());
}

/**
 * Records a payment.
 *
 * Two things can happen, depending on what the payment is for:
 *
 *   * an existing term - only the payment is written;
 *   * a new term       - the term and the payment are written together, which
 *                        is how a renewal gets recorded.
 *
 * Called through `useActionState`, hence the leading `_prevState`.
 */
export async function recordPaymentAction(_prevState, formData) {
  const values = formValues(formData);
  const { valid, errors, data } = validatePayment(formData);

  if (!valid) {
    return failure({
      message: "Please correct the highlighted fields.",
      errors,
      values,
    });
  }

  try {
    if (data.isNewTerm) {
      await createPaymentWithMembership(data);
    } else {
      await createPayment(data);
    }
  } catch (error) {
    // The real error is already logged on the server by lib/db/index.js.
    return failure({
      message:
        error?.message ??
        "Could not record the payment. Please try again in a moment.",
      values,
    });
  }

  // A payment changes what a member owes, and a new term changes their expiry
  // date, so every page showing either has to be refreshed.
  revalidatePath("/payments");
  revalidatePath("/members");
  revalidatePath(`/members/${data.memberId}`);
  revalidatePath("/dashboard");

  // redirect throws a control-flow signal, so it must sit outside the try.
  redirect("/payments?recorded=1");
}

/**
 * Deletes a payment record.
 *
 * The membership term it paid for is left alone on purpose - removing a
 * mistyped receipt should not cancel someone's gym access. The term simply
 * goes back to reading as Unpaid.
 */
export async function deletePaymentAction(paymentId) {
  const id = Number(paymentId);

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "That payment could not be identified." };
  }

  try {
    const deleted = await deletePayment(id);
    if (!deleted) {
      return {
        ok: false,
        message: "That payment no longer exists. It may already have been deleted.",
      };
    }
  } catch (error) {
    return {
      ok: false,
      message: error?.message ?? "Could not delete the payment. Please try again.",
    };
  }

  revalidatePath("/payments");
  revalidatePath("/members");
  revalidatePath("/dashboard");

  return { ok: true };
}
