# TanStack Query (API & Caching) â€” Agentic Mobile Map

## Purpose

Use **TanStack Query v5** as the standard for all **backend API calls** in the frontend: fetching, caching, mutations, and offline-friendly persistence. This skill defines how we structure hooks, keys, persistence, and errors so backend integration stays consistent across the app.

**When to use this skill**: Any new or changed code that calls the backend (errand, places, user, NLU). Prefer `useQuery` / `useMutation` in components; use the shared fetcher for imperative code (e.g. SyncService).

---

## 1. Role in the Stack

| Layer | Tool | Role |
|-------|------|------|
| **Server / API state** | TanStack Query | Fetch, cache, revalidate, persist. Backed by `apiClient` (fetch). |
| **Client / UI state** | Redux | Conversation messages, route (pending/confirmed), NLU flow, UI (dialogs, adjustment), offline flags. |

TanStack does **not** replace Redux. Redux holds app-specific client state; TanStack holds server snapshots and request status (loading, error, data).

---

## 2. Packages

- @tanstack/react-query
- @tanstack/react-query-persist-client
- @tanstack/query-async-storage-persister

Use `@react-native-async-storage/async-storage` (already in the project) for the persister.

---

## 3. Setup (App Root)

- **QueryClient** with defaultOptions.queries: e.g. staleTime 5min, retry 1, gcTime as needed.
- **PersistQueryClientProvider** with createAsyncStoragePersister (storage: AsyncStorage, key: AGENTIC_QUERY_CACHE, throttleTime: 1000). Restrict persisted queries via shouldDehydrateQuery (see section 6).
- **onlineManager**: NetInfo.addEventListener to set onlineManager.setOnline(!!state.isConnected) so queries refetch on reconnect.
- **focusManager**: AppState.addEventListener change to focusManager.setFocused(s === "active") so queries refetch when app returns to foreground.

---

## 4. Fetcher and Errors

All HTTP goes through **apiClient** in frontend/src/services/api/client.ts:

- Base URL, Content-Type, Accept, Authorization (when authToken), and in dev when no token: X-User-Id: dev@local.
- On 4xx/5xx: backend sends { error: { code, message, details?, suggestions? } }. The fetcher must read body.error and return { success: false, error: { code, message, details, suggestions } } so callers can throw in queryFn/mutationFn.

For TanStack: In queryFn/mutationFn, call errandApi/placesApi/userApi. If !res.success, throw res.error. Otherwise return res.data.

---

## 5. Query Keys

Use a factory in frontend/src/services/api/queryKeys.ts:

- queryKeys.all = ["api"]
- queryKeys.anchors() = [...all, "anchors"]
- queryKeys.profile() = [...all, "user", "profile"]
- queryKeys.preferences() = [...all, "user", "preferences"]
- queryKeys.history(limit?, offset?) = [...all, "user", "history", { limit, offset }]
- queryKeys.placeSearch(query, lat, lng) = [...all, "places", "search", query, lat, lng]
- queryKeys.placeDetails(placeId) = [...all, "places", placeId]
- queryKeys.suggestStops(o) = [...all, "suggestions", o]

Mutations (navigate, NLU, escalate, recalculate, preview, disambiguate, anchor CRUD, preferences, clearHistory) use useMutation and invalidateQueries on success.

---

## 6. Persistence

Do persist: anchors, profile, preferences. Do not persist: nlu, navigate, recalculate, preview, place search (or only with short TTL). Use shouldDehydrateQuery to allow only keys like anchors and user.

---

## 7. useQuery and useMutation

**useQuery**: queryKey from queryKeys, queryFn calls api and throws if !res.success else returns res.data, enabled when deps exist, staleTime longer for anchors/profile (10-30min), shorter for place search/suggestStops (2-5min).

**useMutation**: For navigateWithStops, processNLU, escalateToLLM, recalculate, preview, disambiguate, saveAnchor, updateAnchor, deleteAnchor, updatePreferences, clearHistory. mutationFn: call api, throw if !res.success, return res.data. onSuccess: invalidateQueries (e.g. anchors after anchor CRUD, preferences after update). onError: surface ApiError code, message, suggestions in UI.

---

## 8. Example Hooks

useAnchors: useQuery with queryKeys.anchors(), queryFn calling userApi.getAnchors, throw if !res.success, return res.data.anchors, staleTime 10min.

useNavigateWithStops: useMutation with mutationFn calling errandApi.navigateWithStops(body), throw if !res.success, return res.data. onSuccess invalidateQueries queryKeys.all.

---

## 9. Imperative and SyncService

SyncService and other non-React code keep using errandApi, userApi, placesApi directly. No useQuery/useMutation there. The fetcher must normalize body.error and send X-User-Id in dev. For imperative in components use mutation.mutate() or queryClient.fetchQuery.

---

## 10. React Native

onlineManager and focusManager required. Prefer createAsyncStoragePersister; avoid persisting large or high-churn keys. DevTools optional; avoid heavy plugins in release.

---

## 11. References

- TanStack Query React: https://tanstack.com/query/latest/docs/framework/react/overview
- TanStack Query React Native: https://tanstack.com/query/latest/docs/react/react-native
- createAsyncStoragePersister: https://tanstack.com/query/latest/docs/react/plugins/createAsyncStoragePersister

---

## 12. Summary Rules

1. All backend calls through shared api client; support body.error and X-User-Id in dev.
2. Components: useQuery for reads (anchors, profile, preferences, place search, suggestStops, place details), useMutation for writes and one-off (navigate, NLU, escalate, recalculate, preview, disambiguate, anchor CRUD, preferences, history).
3. Query keys central in queryKeys; mutations invalidate as needed.
4. Persist only anchors, profile, preferences.
5. Redux for conversation, route, NLU flow, UI, offline; TanStack for server state only.
