<script>
  let count = 0;
  let todos = ["Buy groceries", "Learn Svelte"];
  let input = "";

  const add = () => {
    if (input.trim()) {
      todos = [...todos, input.trim()];
      input = "";
    }
  };

  const remove = (i) => {
    todos = todos.filter((_, j) => j !== i);
  };
</script>

<div style="font-family: sans-serif; max-width: 480px; margin: 40px auto; padding: 24px">
  <h2>🔥 Svelte Sandbox</h2>

  <h3>Counter</h3>
  <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 24px">
    <button on:click={() => count--} style="background: #FF3E00; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-weight: 700; font-size: 15px">−</button>
    <span style="font-size: 24px; font-weight: 700">{count}</span>
    <button on:click={() => count++} style="background: #FF3E00; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-weight: 700; font-size: 15px">+</button>
  </div>

  <h3>Todo List</h3>
  <div style="display: flex; gap: 8px; margin-bottom: 12px">
    <input
      bind:value={input}
      on:keydown={e => e.key === "Enter" && add()}
      placeholder="Add a task..."
      style="flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 14px"
    />
    <button on:click={add} style="background: #FF3E00; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-weight: 700">Add</button>
  </div>

  <ul style="list-style: none; padding: 0">
    {#each todos as todo, i}
      <li style="display: flex; justify-content: space-between; padding: 8px 12px; background: #f5f5f5; border-radius: 8px; margin-bottom: 6px">
        {todo}
        <button on:click={() => remove(i)} style="background: none; border: none; cursor: pointer; color: #ef4444">✕</button>
      </li>
    {/each}
  </ul>
</div>
