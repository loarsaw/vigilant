import { Link } from "react-router-dom";
import { HashRouter } from "react-router-dom";

const App = () => {
  return (
    <div className="text-red-400">
      App
      <Link to={"/team"}>Team</Link>
    </div>
  );
};

export default App;
