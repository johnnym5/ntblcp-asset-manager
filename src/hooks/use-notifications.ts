
"use client"

import * as React from "react"

export type Notification = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  date: Date
  read: boolean
  variant?: "default" | "destructive"
  action?: React.ReactNode
}

const actionTypes = {
  ADD_NOTIFICATION: "ADD_NOTIFICATION",
  MARK_ALL_AS_READ: "MARK_ALL_AS_READ",
  CLEAR_ALL: "CLEAR_ALL",
  REMOVE_NOTIFICATION: "REMOVE_NOTIFICATION",
} as const

const NOTIFICATIONS_STORAGE_KEY = "assetain-notifications";

let count = 0
// A more robust ID generator for persistent notifications
function genId() {
  count = (count + 1) % 1000;
  return `${new Date().getTime()}-${count}`;
}

type ActionType = typeof actionTypes
type Action =
  | { type: ActionType["ADD_NOTIFICATION"]; notification: Notification }
  | { type: ActionType["MARK_ALL_AS_READ"] }
  | { type: ActionType["CLEAR_ALL"] }
  | { type: ActionType["REMOVE_NOTIFICATION"]; id: string }

interface State {
  notifications: Notification[]
}

const listeners: Array<(state: State) => void> = []

// Safely initialize state from localStorage
let memoryState: State = (() => {
    if (typeof window === 'undefined') {
        return { notifications: [] };
    }
    try {
        const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
        if (stored) {
            const parsedState = JSON.parse(stored);
            // Revive date objects from string format
            if (Array.isArray(parsedState.notifications)) {
              parsedState.notifications = parsedState.notifications.map((n: any) => ({
                  ...n,
                  date: new Date(n.date)
              }));
            }
            return parsedState;
        }
    } catch (e) {
        console.error("Failed to load notifications from storage", e);
    }
    return { notifications: [] };
})();


function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  
  if (typeof window !== 'undefined') {
    try {
        // Create a serializable version of the state by omitting the 'action' property, 
        // which can be a non-serializable React component.
        const serializableState = {
            ...memoryState,
            notifications: memoryState.notifications.map(({ action, ...rest }) => rest),
        };
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(serializableState));
    } catch (e) {
        console.error("Failed to save notifications to storage", e);
    }
  }

  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [action.notification, ...state.notifications].slice(0, 50),
      }
    case "MARK_ALL_AS_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      }
    case "CLEAR_ALL":
      return {
        ...state,
        notifications: [],
      }
    case "REMOVE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.id),
      }
    default:
        return state;
  }
}

export function addNotification(props: Omit<Notification, "id" | "date" | "read">) {
  const id = genId()
  dispatch({
    type: "ADD_NOTIFICATION",
    notification: {
      ...props,
      id,
      date: new Date(),
      read: false,
    },
  })
}

export function removeNotification(id: string) {
  dispatch({ type: "REMOVE_NOTIFICATION", id });
}

export function markAllAsRead() {
    dispatch({ type: "MARK_ALL_AS_READ" });
}

export function clearAll() {
    dispatch({ type: "CLEAR_ALL" });
}

export function useNotifications() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])
  
  const unreadCount = React.useMemo(() => state.notifications.filter(n => !n.read).length, [state.notifications]);

  return {
    ...state,
    unreadCount,
    markAllAsRead,
    clearAll,
  }
}
