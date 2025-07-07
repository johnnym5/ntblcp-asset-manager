
"use client"

import * as React from "react"

export type Notification = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  date: Date
  read: boolean
  variant?: "default" | "destructive"
}

const actionTypes = {
  ADD_NOTIFICATION: "ADD_NOTIFICATION",
  MARK_ALL_AS_READ: "MARK_ALL_AS_READ",
  CLEAR_ALL: "CLEAR_ALL",
} as const

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes
type Action =
  | { type: ActionType["ADD_NOTIFICATION"]; notification: Notification }
  | { type: ActionType["MARK_ALL_AS_READ"] }
  | { type: ActionType["CLEAR_ALL"] }

interface State {
  notifications: Notification[]
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { notifications: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
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
  }, [state])
  
  const unreadCount = React.useMemo(() => state.notifications.filter(n => !n.read).length, [state.notifications]);

  return {
    ...state,
    unreadCount,
    markAllAsRead,
    clearAll,
  }
}
