"use client";

import { usePushNotifications, useDeadlineNotifications } from "@/hooks/usePushNotifications";
import { useTasks } from "@/hooks/useTasks";

export function PushSetup() {
  usePushNotifications();
  const { tasks } = useTasks();
  useDeadlineNotifications(tasks);
  return null;
}
