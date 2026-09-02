# vigilant-jobs-vue

Vue 3 composables for browsing job postings and applying to them, built
on [`vigilant-jobs-client`](../core).

## Install

```bash
npm install vigilant-jobs-vue
```

(`vigilant-jobs-client` comes along as a dependency — you don't need to
install it separately.)

## Setup

### Option A — plugin (recommended, set up once in `main.ts`)

```ts
import { createApp } from "vue";
import { createVigilantPlugin } from "vigilant-jobs-vue";
import App from "./App.vue";

const app = createApp(App);
app.use(createVigilantPlugin({ baseUrl: "https://api.yourapp.com" }));
app.mount("#app");
```

### Option B — provide inside a component's `setup()`

```ts
import { provideVigilantClient } from "vigilant-jobs-vue";

provideVigilantClient({ baseUrl: "https://api.yourapp.com" });
```

## Usage

```vue
<script setup lang="ts">
import { toRef } from "vue";
import { usePositions, usePosition, useApply } from "vigilant-jobs-vue";

const { positions, loading, error } = usePositions({ active: true });

const props = defineProps<{ id: string }>();
const { position } = usePosition(toRef(props, "id")); // refetches when id changes
// or usePosition(props.id) for a one-off fetch that never refetches

const { apply, loading: applying, error: applyError, data } = useApply();

async function onApply() {
  if (!position.value) return;
  await apply(position.value.id, { name: "Jane Doe", email: "jane@example.com" });
}
</script>

<template>
  <p v-if="loading">Loading…</p>
  <p v-else-if="error">Something went wrong: {{ error.message }}</p>
  <ul v-else>
    <li v-for="p in positions" :key="p.id">{{ p.title }}</li>
  </ul>
</template>
```

> Note: `usePosition` accepts a plain value or a `Ref`. If you pass a
> plain value it fetches once; pass a `Ref` (e.g. `toRef(props, "id")`)
> if you want it to refetch automatically when the id changes.

## Exports

- `createVigilantPlugin`, `provideVigilantClient`, `useVigilantClient` — setup
- `usePositions(params?)` — `{ positions, loading, error, refetch }` (all `Ref`s)
- `usePosition(id)` — `{ position, loading, error, refetch }` (all `Ref`s)
- `useApply()` — `{ apply, loading, error, data, reset }`
- Everything from `vigilant-jobs-client` is re-exported for convenience.

## Build

```bash
npm install
npm run build
npm run typecheck
```
