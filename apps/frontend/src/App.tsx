import { ComponentsPlayground } from "./components-playground";
import { A3PayDemo } from "./views/a3pay-demo";
import { PortfolioView } from "@siteportfolio/PortfolioView";

export function App() {
  if (window.location.pathname === "/components") {
    return <ComponentsPlayground />;
  }

  if (window.location.pathname.startsWith("/portfolio")) {
    return <PortfolioView />;
  }

  return <A3PayDemo />;
}
