import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);
  const [todos, setTodos] = useState(["Buy groceries", "Learn React"]);
  const [input, setInput] = useState("");

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, input.trim()]);
      setInput("");
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <h2>⚛️ React Sandbox</h2>

      <div style={{ marginBottom: 24 }}>
        <h3>Counter</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => setCount(c => c - 1)} style={btn("#61DAFB", "#000")}>−</button>
          <span style={{ fontSize: 24, fontWeight: 700 }}>{count}</span>
          <button onClick={() => setCount(c => c + 1)} style={btn("#61DAFB", "#000")}>+</button>
        </div>
      </div>

      <h3>Todo List</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTodo()}
          placeholder="Add a task..."
          style={inp}
        />
        <button onClick={addTodo} style={btn("#61DAFB", "#000")}>Add</button>
      </div>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {todos.map((t, i) => (
          <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f5f5f5", borderRadius: 8, marginBottom: 6 }}>
            {t}
            <button onClick={() => setTodos(todos.filter((_, j) => j !== i))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const btn = (bg, color) => ({ background: bg, color, border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: 15 });
const inp = { flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", fontSize: 14 };
