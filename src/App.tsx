import { TooltipProvider } from "@/components/ui/tooltip";
import { TaxReturnProvider } from "@/state/tax-return-store";
import { Workspace } from "@/components/layout/Workspace";

function App() {
  return (
    <TooltipProvider delayDuration={150}>
      <TaxReturnProvider>
        <Workspace />
      </TaxReturnProvider>
    </TooltipProvider>
  );
}

export default App;
