"use client";

import { toast } from "sonner";

export function meldeErfolg(text: string) {
  toast.success(text);
}

export function meldeFehler(text: string) {
  toast.error(text);
}
