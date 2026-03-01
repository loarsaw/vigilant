<template>
  <div style="font-family: sans-serif; max-width: 480px; margin: 40px auto; padding: 24px">
    <h2>💚 Vue Sandbox</h2>

    <div style="margin-bottom: 24px">
      <h3>Counter</h3>
      <div style="display: flex; gap: 12px; align-items: center">
        <button @click="count--" style="background: #42B883; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-weight: 700; font-size: 15px">−</button>
        <span style="font-size: 24px; font-weight: 700">{{ count }}</span>
        <button @click="count++" style="background: #42B883; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-weight: 700; font-size: 15px">+</button>
      </div>
    </div>

    <h3>Todo List</h3>
    <div style="display: flex; gap: 8px; margin-bottom: 12px">
      <input
        v-model="input"
        @keydown.enter="add"
        placeholder="Add a task..."
        style="flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 14px"
      />
      <button @click="add" style="background: #42B883; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-weight: 700">Add</button>
    </div>

    <ul style="list-style: none; padding: 0">
      <li
        v-for="(t, i) in todos"
        :key="i"
        style="display: flex; justify-content: space-between; padding: 8px 12px; background: #f5f5f5; border-radius: 8px; margin-bottom: 6px"
      >
        {{ t }}
        <button @click="todos.splice(i, 1)" style="background: none; border: none; cursor: pointer; color: #ef4444">✕</button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from "vue";

const count = ref(0);
const todos = ref(["Buy groceries", "Learn Vue"]);
const input = ref("");

const add = () => {
  if (input.value.trim()) {
    todos.value.push(input.value.trim());
    input.value = "";
  }
};
</script>
