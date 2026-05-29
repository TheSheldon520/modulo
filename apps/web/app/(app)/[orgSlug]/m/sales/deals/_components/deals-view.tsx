"use client";
// "use client" justification: this component assembles the two interactive
// Client Components (<NewDealDialog> and <DealsTable>) and passes the server-
// resolved `ownerId` prop down. Keeping this thin wrapper Client avoids
// prop-drilling through a Server Component boundary while preserving the
// Server Component page.tsx above (which reads session + i18n strings).

import { NewDealDialog } from "./new-deal-dialog";
import { DealsTable } from "./deals-table";

interface DealsViewProps {
  ownerId: string;
  title: string;
  newDealLabel: string;
}

export function DealsView({ ownerId, title, newDealLabel }: DealsViewProps) {
  return (
    <>
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-medium tracking-tight text-text-primary">
          {title}
        </h1>
        <NewDealDialog ownerId={ownerId} newDealLabel={newDealLabel} />
      </header>
      <DealsTable />
    </>
  );
}
