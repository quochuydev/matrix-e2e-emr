"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type PatientRecord } from "matrix-client/patients";

export type FormValues = Omit<PatientRecord, "updatedAt" | "updatedTimes">;

export const EMPTY: FormValues = {
  firstName: "",
  lastName: "",
  dob: "",
  phone: "",
  email: "",
  notes: "",
};

export function PatientFormFields({
  values,
  onChange,
}: {
  values: FormValues;
  onChange: (next: FormValues) => void;
}) {
  const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) =>
    onChange({ ...values, [k]: v });
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName" className="text-sm font-medium">
            First name
          </Label>
          <Input
            id="firstName"
            className="h-10"
            value={values.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            placeholder="Jane"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName" className="text-sm font-medium">
            Last name
          </Label>
          <Input
            id="lastName"
            className="h-10"
            value={values.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            placeholder="Doe"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dob" className="text-sm font-medium">
            Date of birth
          </Label>
          <Input
            id="dob"
            type="date"
            className="h-10"
            value={values.dob ?? ""}
            onChange={(e) => set("dob", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-sm font-medium">
            Phone
          </Label>
          <Input
            id="phone"
            type="tel"
            className="h-10"
            value={values.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+1 555 000 0000"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          className="h-10"
          value={values.email ?? ""}
          onChange={(e) => set("email", e.target.value)}
          placeholder="jane@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-sm font-medium">
          Notes
        </Label>
        <textarea
          id="notes"
          value={values.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          rows={4}
          placeholder="Allergies, ongoing conditions, anything the care team should know…"
          className="flex w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </div>
    </div>
  );
}
