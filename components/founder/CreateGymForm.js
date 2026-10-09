"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { BuildingPlusIcon } from "@/components/ui/icons";
import { apiRequest, formToObject } from "@/lib/client/api";
import styles from "./CreateGymForm.module.css";

/** Name, owner, email and password for a new gym. */
export default function CreateGymForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const [done, setDone] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setPending(true);
    setResult(null);
    setDone(null);

    const form = event.currentTarget;
    const response = await apiRequest("/api/founder/gyms", {
      method: "POST",
      body: formToObject(form),
    });

    if (response.ok) {
      form.reset();
      setDone(`${response.gym.name} is ready. ${response.gym.ownerEmail} can sign in on the gym login page.`);
      router.refresh();
    } else {
      setResult(response);
    }
    setPending(false);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {result?.message && <Alert>{result.message}</Alert>}
      {done && <Alert variant="success">{done}</Alert>}

      <Input id="name" label="Gym name" required autoComplete="organization" error={result?.errors?.name} />
      <Input id="ownerName" name="ownerName" label="Owner name" required autoComplete="name" error={result?.errors?.ownerName} />
      <Input
        id="email"
        label="Owner email"
        type="email"
        required
        autoComplete="off"
        error={result?.errors?.email}
      />
      <Input
        id="password"
        label="Owner password"
        type="password"
        required
        autoComplete="new-password"
        error={result?.errors?.password}
      />

      <Button type="submit" variant="primary" fullWidth disabled={pending}>
        <BuildingPlusIcon size={18} />
        {pending ? "Adding gym…" : "Create gym"}
      </Button>
    </form>
  );
}
