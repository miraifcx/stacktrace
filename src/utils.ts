import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getSeverityColors = (severity?: string) => {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/50";
    case "high":
      return "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50";
    case "medium":
      return "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-500 border-amber-200 dark:border-amber-900/50";
    case "low":
      return "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-500 border-emerald-200 dark:border-emerald-900/50";
    default:
      return "bg-zinc-100 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800";
  }
};

export const getStatusColors = (resolved?: boolean) => {
  if (resolved) {
    return "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50";
  }
  return "bg-zinc-100 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800";
};
