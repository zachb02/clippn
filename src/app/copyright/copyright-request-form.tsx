"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CircleNotch, PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr";
import {
  copyrightRequestSchema,
  type CopyrightRequestInput,
} from "@/lib/schemas/request-forms";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function CopyrightRequestForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CopyrightRequestInput>({
    resolver: zodResolver(copyrightRequestSchema),
    defaultValues: {
      name: "",
      email: "",
      description: "",
      assetUrl: "",
      goodFaith: false,
      signature: "",
    },
  });

  async function onSubmit(values: CopyrightRequestInput) {
    try {
      const res = await fetch("/api/copyright-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("request-failed");
      toast.success("Copyright request submitted. We'll follow up by email.");
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
          We&apos;ll follow up at the email address you provided.
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
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" autoComplete="name" {...register("name")} />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description of the copyrighted work</Label>
        <Textarea
          id="description"
          rows={4}
          placeholder="Describe the original work you own or represent, and how the content in question infringes it."
          {...register("description")}
        />
        {errors.description ? (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="assetUrl">URL or asset identifier of the content</Label>
        <Input
          id="assetUrl"
          placeholder="https://... or a project/asset ID"
          {...register("assetUrl")}
        />
        {errors.assetUrl ? (
          <p className="text-xs text-destructive">{errors.assetUrl.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label className="flex items-start gap-2.5 text-sm leading-relaxed">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
            {...register("goodFaith")}
          />
          <span>
            I have a good-faith belief that the use described above is not authorized
            by the copyright owner, its agent, or the law, and the information in this
            request is accurate.
          </span>
        </label>
        {errors.goodFaith ? (
          <p className="text-xs text-destructive">{errors.goodFaith.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signature">Signature (type your full name)</Label>
        <Input id="signature" {...register("signature")} />
        {errors.signature ? (
          <p className="text-xs text-destructive">{errors.signature.message}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <CircleNotch className="animate-spin" /> : <PaperPlaneTilt />}
        Submit request
      </Button>
    </form>
  );
}
