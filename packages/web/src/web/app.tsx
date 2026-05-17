import { Route, Switch } from "wouter";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";
import Index from "./pages/index";
import Create from "./pages/create";
import Dashboard from "./pages/dashboard";
import QRDetail from "./pages/qr-detail";
import Pricing from "./pages/pricing";
import Login from "./pages/login";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Index} />
        <Route path="/create" component={Create} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/dashboard/:id" component={QRDetail} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/login" component={Login} />
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
