"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CreateConnectionSchema, type CreateConnectionInput } from "@/lib/schemas/provider-connection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ConnectionForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateConnectionInput>({
    resolver: zodResolver(CreateConnectionSchema),
    defaultValues: { provider: "mock", storageMode: "session", label: "", apiKey: "" },
  });

  async function onSubmit(values: CreateConnectionInput) {
    setSubmitting(true);
    try {
      const response = await fetch("/api/providers/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "Could not connect this provider.");
        return;
      }
      toast.success(`Connected ${values.label}.`);
      reset({ provider: "mock", storageMode: "session", label: "", apiKey: "" });
      router.refresh();
    } catch {
      toast.error("Network error -- could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-border/60 bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="provider">Provider</Label>
          <Controller
            control={control}
            name="provider"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="provider" className="mt-1.5 w-full">
                  <SelectValue placeholder="Choose a provider">
                    {(value: string | null) =>
                      value === "mock"
                        ? "Mock Provider (no real key needed)"
                        : value === "google-gemini"
                          ? "Google Gemini"
                          : value === "openai"
                            ? "OpenAI"
                            : "Choose a provider"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock">Mock Provider (no real key needed)</SelectItem>
                  <SelectItem value="google-gemini">Google Gemini</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="label">Label</Label>
          <Input id="label" className="mt-1.5" placeholder="e.g. Personal Gemini key" {...register("label")} />
          {errors.label && <p className="mt-1 text-xs text-destructive">{errors.label.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="apiKey">API key</Label>
        <Input
          id="apiKey"
          type="password"
          autoComplete="off"
          className="mt-1.5"
          placeholder="Paste your provider API key"
          {...register("apiKey")}
        />
        {errors.apiKey && <p className="mt-1 text-xs text-destructive">{errors.apiKey.message}</p>}
        <p className="mt-1.5 text-xs text-muted-foreground">
          Not your account password. Not a cookie or OAuth token. An API key, from your
          provider&apos;s developer console.
        </p>
      </div>

      <div>
        <Label>Storage</Label>
        <Controller
          control={control}
          name="storageMode"
          render={({ field }) => (
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => field.onChange("session")}
                className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  field.value === "session"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="font-medium">Session only</span>
                <span className="block text-xs text-muted-foreground">
                  Default. Expires automatically, never touches disk.
                </span>
              </button>
              <button
                type="button"
                onClick={() => field.onChange("remembered")}
                className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  field.value === "remembered"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="font-medium">Remember securely</span>
                <span className="block text-xs text-muted-foreground">
                  Encrypted individually before storage.
                </span>
              </button>
            </div>
          )}
        />
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Connecting…" : "Connect"}
      </Button>
    </form>
  );
}
