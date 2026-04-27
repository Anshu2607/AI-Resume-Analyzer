import { BrowserRouter } from "react-router-dom";
import Interview from "./pages/Interview";

export default function App() {
  return (
    <BrowserRouter>
      <Interview />
    </BrowserRouter>
  );
}