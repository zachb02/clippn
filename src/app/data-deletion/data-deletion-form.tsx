"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CircleNotch, Trash } from "@phosphor-icons/react/dist/ssr";
import {
  dataDeletionRequestSchema,
  type DataDeletionRequestInput,
} from "@/lib/schemas/request-forms";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function DataDeletionForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DataDeletionRequestInput>({
    resolver: zodResolver(dataDeletionRequestSchema),
    defaultValues: {
      email: "",
      note: "",
      confirm: false,
    },
  });

  async function onSubmit(values: DataDeletionRequestInput) {
    try {
      const res = await fetch("/api/data-deletion-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("request-failed");
      toast.success("Deletion request submitted. We'll confirm by email.");
      reset();
      setSubmitted(true);
    } catch {
      toast.error("Couldn't submit the request. Please try again.");
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
        <p className="font-medium">Request received.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ll confirm at the email address you provided and let you know when the
          grace period ends.
        </p>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => setSubmitted(false)}
        >
          Submit another request
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 rounded-xl border border-border/60 bg-card p-6 sm:p-8"
      noValidate
    >
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address on your account</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email ? (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">Anything we should know (optional)</Label>
        <Textarea
          id="note"
          rows={3}
          placeholder="Optional context — e.g. you also want a specific project removed sooner."
          {...register("note")}
        />
        {errors.note ? (
          <p className="text-xs text-destructive">{errors.note.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label className="flex items-start gap-2.5 text-sm leading-relaxed">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
            {...register("confirm")}
          />
          <span>
            I understand this permanently deletes my account and associated data after
            the grace period described above, and that this cannot be undone once it
            completes.
          </span>
        </label>
        {errors.confirm ? (
          <p className="text-xs text-destructive">{errors.confirm.message}</p>
        ) : null}
      </div>

      <Button type="submit" variant="destructive" disabled={isSubmitting}>
        {isSubmitting ? <CircleNotch className="animate-spin" /> : <Trash />}
        Request deletion
      </Button>
    </form>
  );
}
